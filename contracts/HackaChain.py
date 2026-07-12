# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# =============================================================================
#  HackaChain.py — Decentralized AI Hackathon Judge
#  GenLayer Intelligent Contract (v0.2.16)
#
#  FIX LOG (v2):
#  ─────────────
#  • All class-level `int` storage fields replaced with GenLayer sized integers:
#      prize_pool_wei      : u256  (large token amounts)
#      submission_deadline : u64   (UNIX timestamp)
#      judging_deadline    : u64   (UNIX timestamp)
#      submission_count    : u64   (monotonic counter)
#      scores_*            : i32   (signed; -1 sentinel for "not judged")
#      prize_claims values : u256  (token amounts)
#      TreeMap keys (pid)  : u64
#  • `range(self.submission_count)` wrapped in `int()` cast where needed
#  • All method *parameters* keep plain `int` (allowed by Rule 4)
#
#  Architecture Overview:
#  ─────────────────────
#  Organizer locks a prize pool → Participants submit project URLs →
#  GenLayer's non-deterministic VM scrapes each URL with web.render() →
#  An LLM judge evaluates 3 axes (Tech, UI, Completeness) and produces
#  a JSON scorecard → Multiple validator nodes reach CONSENSUS on the
#  score (within ±5 variance tolerance) → Smart contract distributes
#  the prize pool proportionally to top-ranked submissions.
#
#  CRITICAL: Every gl.nondet.* call lives inside gl.vm.run_nondet_unsafe()
#  so that the GenLayer consensus protocol can replay and verify results
#  across all validator nodes before finalising state changes.
# =============================================================================

from genlayer import *   # Rule 13: ALWAYS use this form. Never import genlayer as gl.
import json
import time


@gl.evm.contract_interface
class Recipient:
    class View:
        pass
    class Write:
        pass



# ---------------------------------------------------------------------------
# Module-level constants  (plain Python int — NOT stored in contract storage)
# ---------------------------------------------------------------------------

MAX_AXIS_SCORE:         int = 30   # tech + ui + completeness each /30 → total /90
SCORE_VARIANCE_TOLERANCE: int = 5  # validator accepts leader result if diff ≤ 5 pts
MAX_SUBMISSIONS:        int = 50   # hard cap to stay within gas limits
MAX_WINNERS:            int = 3    # podium places 1st / 2nd / 3rd


# ---------------------------------------------------------------------------
# Contract Storage Schema
# ─────────────────────────────────────────────────────────────────────────
# Rules 2 & 5:
#   • All persistent state MUST use TreeMap / DynArray — no dict or list.
#   • NEVER use `int` for class-level storage fields; use sized integers
#     (u8, u16, u32, u64, u128, u256, i8, i16, i32, i64, i128, i256, bigint).
#   • Fields declared at class level as type annotations ONLY — the GenLayer
#     runtime auto-initialises them; NEVER call TreeMap() inside __init__.
# ---------------------------------------------------------------------------

class Contract(gl.Contract):   # Rule 6: class name = Contract, extends gl.Contract
    """
    HackaChain — Decentralized AI Hackathon Judge
    ==============================================
    Lifecycle:
        1. organizer calls setup_hackathon()   → locks prize pool metadata
        2. participants call submit_project()   → URL goes into submission queue
        3. organizer calls judge_project(pid)   → AI scores the project (nondet)
        4. organizer calls finalize_hackathon() → prize distribution calculated
        5. winners call claim_prize()           → withdraws their share
    """

    # ── Hackathon metadata ──────────────────────────────────────────────
    hackathon_name:        str     # display name of this hackathon
    organizer:             Address # who deployed / manages this contract
    prize_pool_wei:        u256    # total prize pool — u256 for large token amounts
    submission_deadline:   u64     # UNIX timestamp; 0 = not set
    judging_deadline:      u64     # UNIX timestamp; 0 = not set
    is_finalized:          bool    # True once prizes are locked in
    is_setup:              bool    # True once organizer has run setup

    # ── Submission registry ─────────────────────────────────────────────
    # TreeMap[pid(u64) → url_string]
    submission_urls:       TreeMap[u64, str]
    # TreeMap[pid(u64) → submitter_address_string]
    submission_owners:     TreeMap[u64, str]
    # TreeMap[pid(u64) → submission_name]
    submission_names:      TreeMap[u64, str]
    # Monotonic counter for submission IDs
    submission_count:      u64

    # ── Scorecard storage ───────────────────────────────────────────────
    # i32 used for scores: allows -1 sentinel ("not judged yet") and 0-90 range
    # TreeMap[pid(u64) → tech_score  (i32: -1 or 0-30)]
    scores_tech:           TreeMap[u64, i32]
    # TreeMap[pid(u64) → ui_score    (i32: -1 or 0-30)]
    scores_ui:             TreeMap[u64, i32]
    # TreeMap[pid(u64) → completeness_score (i32: -1 or 0-30)]
    scores_completeness:   TreeMap[u64, i32]
    # TreeMap[pid(u64) → total_score (i32: -1 or 0-90)]
    scores_total:          TreeMap[u64, i32]
    # TreeMap[pid(u64) → AI reasoning text]
    scores_reasoning:      TreeMap[u64, str]
    # TreeMap[pid(u64) → has been judged flag]
    is_judged:             TreeMap[u64, bool]

    # ── Prize distribution ──────────────────────────────────────────────
    # TreeMap[winner_address_str → prize_wei (u256)]
    prize_claims:          TreeMap[str, u256]
    # TreeMap[winner_address_str → has_claimed flag]
    has_claimed:           TreeMap[str, bool]


    # ═══════════════════════════════════════════════════════════════════
    # CONSTRUCTOR
    # ═══════════════════════════════════════════════════════════════════
    def __init__(self) -> None:
        """
        Minimal constructor — GenLayer auto-initialises all TreeMap fields
        declared above (Rule 2). We only set primitive defaults here.
        NOTE: u256/u64/i32 fields accept plain Python int literals.
        """
        self.hackathon_name      = ""
        self.organizer           = gl.message.sender_address
        self.prize_pool_wei      = 0
        self.submission_deadline = 0
        self.judging_deadline    = 0
        self.is_finalized        = False
        self.is_setup            = False
        self.submission_count    = 0


    # ═══════════════════════════════════════════════════════════════════
    # ORGANIZER: HACKATHON SETUP
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write.payable
    def setup_hackathon(
        self,
        name:                str,
        prize_pool_wei:      int,   # Rule 3: method params use plain int (allowed)
        submission_deadline: int,   # UNIX timestamp
        judging_deadline:    int,   # UNIX timestamp
    ) -> None:
        """
        Initialise the hackathon parameters. Can only be called once by the organizer.
        prize_pool_wei is in the smallest token unit (e.g., 1_000_000 = 1 USDC).
        """
        if gl.message.sender_address != self.organizer:
            raise UserError("Only the organizer can configure this hackathon.")

        if self.is_setup:
            raise UserError("Hackathon is already configured.")

        # Require real token escrow
        if gl.message.value != u256(prize_pool_wei):
            raise UserError("Sent transaction value does not match the configured prize pool.")

        if prize_pool_wei <= 0:
            raise UserError("Prize pool must be greater than zero.")

        if judging_deadline <= submission_deadline:
            raise UserError("Judging deadline must be after submission deadline.")

        self.hackathon_name       = name
        self.prize_pool_wei       = gl.message.value    # real escrowed pool
        self.submission_deadline  = submission_deadline  # auto-coerced to u64
        self.judging_deadline     = judging_deadline     # auto-coerced to u64
        self.is_setup             = True


    # ═══════════════════════════════════════════════════════════════════
    # PARTICIPANT: SUBMIT PROJECT
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def submit_project(
        self,
        project_name: str,
        project_url:  str,   # Devpost / GitHub / Presentation URL
    ) -> int:
        """
        Register a hackathon submission. Returns the assigned project ID (pid).
        Each participant should submit their primary public URL.
        """
        if not self.is_setup:
            raise UserError("Hackathon has not been configured yet.")

        if self.is_finalized:
            raise UserError("Hackathon is already finalized; no more submissions.")

        # Enforce submission deadline
        if int(time.time()) >= int(self.submission_deadline):
            raise UserError("Submission deadline has passed.")

        if len(project_url) == 0:
            raise UserError("Project URL cannot be empty.")

        if len(project_name) == 0:
            raise UserError("Project name cannot be empty.")

        # Cast u64 → int for comparison with Python int constant
        if int(self.submission_count) >= MAX_SUBMISSIONS:
            raise UserError("Maximum submission limit reached.")

        pid = self.submission_count          # u64
        submitter = str(gl.message.sender_address)

        self.submission_urls[pid]   = project_url
        self.submission_owners[pid] = submitter
        self.submission_names[pid]  = project_name
        self.submission_count       = int(pid) + 1   # u64 + int → assign back

        # Initialise score fields with sentinel -1 (i32: means "not judged yet")
        self.scores_tech[pid]         = -1
        self.scores_ui[pid]           = -1
        self.scores_completeness[pid] = -1
        self.scores_total[pid]        = -1
        self.scores_reasoning[pid]    = ""
        self.is_judged[pid]           = False

        return int(pid)   # Return plain int (Rule 4 return type)


    # ═══════════════════════════════════════════════════════════════════
    # ORGANIZER: AI JUDGING  ← THE CORE NON-DETERMINISTIC LOGIC
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def judge_project(self, pid: int) -> None:
        """
        Uses GenLayer's non-deterministic oracle to:
          1. Scrape the project's public URL with gl.nondet.web.render()
          2. Send the scraped content to an LLM with gl.nondet.exec_prompt()
          3. Parse the returned JSON scorecard
          4. Persist the scores to on-chain storage

        The entire evaluation is wrapped in gl.vm.run_nondet_unsafe() so
        that multiple validator nodes each independently:
          - Fetch the URL
          - Run the LLM evaluation
          - Produce their own candidate scorecard

        The LEADER node's result is accepted only if validator nodes
        agree within SCORE_VARIANCE_TOLERANCE (±5 pts total score).
        This is enforced by the custom validator_fn below.
        """
        # ── Pre-flight checks ──────────────────────────────────────────
        if not self.is_setup:
            raise UserError("Hackathon has not been configured yet.")

        if self.is_finalized:
            raise UserError("Hackathon is finalized; judging is closed.")

        # Enforce judging deadline
        if int(time.time()) >= int(self.judging_deadline):
            raise UserError("Judging deadline has passed.")

        if gl.message.sender_address != self.organizer:
            raise UserError("Only the organizer can trigger AI judging.")

        # pid param is plain int (method param); cast submission_count for comparison
        if pid < 0 or pid >= int(self.submission_count):
            raise UserError(f"Invalid project ID: {pid}.")

        if self.is_judged[pid]:
            raise UserError(f"Project {pid} has already been judged.")

        url          = self.submission_urls[pid]
        project_name = self.submission_names[pid]

        # ── Non-Deterministic Evaluation Block ────────────────────────
        # RULE 7: ALL gl.nondet.* calls MUST live inside run_nondet_unsafe().
        # The leader_fn produces the authoritative result; validator_fn
        # checks whether each validator's independent result is close enough
        # to the leader's to count as "in consensus".

        def leader_fn() -> str:
            """
            Called on the LEADER node. Fetches the URL and runs LLM scoring.
            Returns a raw JSON string that will be stored if consensus is reached.
            """
            # ── Step 1: Scrape the project URL ─────────────────────────
            # web.render() executes a headless Chromium render, giving us
            # the fully-hydrated DOM text — crucial for SPAs like Devpost.
            try:
                raw_page: str = gl.nondet.web.render(url)
            except Exception as fetch_err:
                # If the URL is unreachable (404, network error, etc.) we
                # return a structured error sentinel that the contract can
                # detect and handle gracefully.
                return json.dumps({
                    "error": f"URL_FETCH_FAILED: {str(fetch_err)}",
                    "tech_score": 0,
                    "ui_score": 0,
                    "completeness_score": 0,
                    "reasoning": "Unable to access project URL. Scored 0 by default."
                })

            # Truncate page content to stay within LLM context limits.
            # 12 000 chars ≈ ~3 000 tokens — enough for a rich README/Devpost page.
            page_content = raw_page[:12000] if len(raw_page) > 12000 else raw_page

            if len(page_content.strip()) < 50:
                # Page rendered but returned near-empty content (JS-gated, bot block)
                return json.dumps({
                    "error": "PAGE_CONTENT_TOO_SHORT",
                    "tech_score": 5,
                    "ui_score": 5,
                    "completeness_score": 5,
                    "reasoning": (
                        "The page returned insufficient content for evaluation. "
                        "Minimum scores assigned."
                    )
                })

            # ── Step 2: LLM Judge Evaluation ───────────────────────────
            judge_prompt = f"""You are an elite hackathon judge panel consisting of:
- A Senior Full-Stack Engineer (evaluates technical depth & innovation)
- A UX/Design Lead (evaluates interface quality & user experience)
- A Product Manager (evaluates completeness & real-world viability)

You are evaluating the hackathon project: "{project_name}"

---BEGIN PROJECT PAGE CONTENT---
{page_content}
---END PROJECT PAGE CONTENT---

Evaluate this project strictly on the following three axes.
Each axis is scored from 0 to 30 (integer only, no decimals).

SCORING rubric:
1. tech_score (0-30): Assesses technological innovation, code quality signals,
   architecture choices, use of AI/Web3/novel APIs, and overall engineering depth.
   Look for: GitHub links, code snippets, tech stack mentions, architecture diagrams.

2. ui_score (0-30): Assesses the quality of the user interface and experience.
   Look for: screenshots, demo videos, Figma links, accessibility mentions,
   mobile-responsiveness, and overall visual polish described.

3. completeness_score (0-30): Assesses whether this is a working product vs a prototype.
   Look for: live demo link, deployment evidence, test coverage mentions,
   documentation quality, and whether the core use-case is fully addressed.

DEDUCTIONS:
- If there is no code link or GitHub repo: deduct up to 10 from tech_score
- If there is no demo/screenshot: deduct up to 10 from ui_score
- If the submission is only a README with no working parts: deduct up to 15 from completeness_score

OUTPUT FORMAT (respond ONLY with this exact JSON, no markdown, no extra text):
{{
  "tech_score": <integer 0-30>,
  "ui_score": <integer 0-30>,
  "completeness_score": <integer 0-30>,
  "reasoning": "<2-3 sentence expert justification covering all three axes>"
}}"""

            # ── Step 3: Execute the LLM prompt ─────────────────────────
            raw_llm_output: str = gl.nondet.exec_prompt(judge_prompt)

            # ── Step 4: Clean and validate the JSON response ───────────
            # LLMs sometimes wrap JSON in markdown fences; strip them.
            cleaned = raw_llm_output.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                inner_lines = []
                for line in lines[1:]:
                    if line.strip() == "```":
                        break
                    inner_lines.append(line)
                cleaned = "\n".join(inner_lines).strip()

            try:
                parsed = json.loads(cleaned)
                parsed["tech_score"]         = max(0, min(MAX_AXIS_SCORE, int(parsed.get("tech_score", 0))))
                parsed["ui_score"]           = max(0, min(MAX_AXIS_SCORE, int(parsed.get("ui_score", 0))))
                parsed["completeness_score"] = max(0, min(MAX_AXIS_SCORE, int(parsed.get("completeness_score", 0))))
                parsed["reasoning"]          = str(parsed.get("reasoning", "No reasoning provided."))[:1000]
                return json.dumps(parsed)
            except (json.JSONDecodeError, KeyError, ValueError) as parse_err:
                return json.dumps({
                    "error": f"JSON_PARSE_FAILED: {str(parse_err)}",
                    "tech_score": 10,
                    "ui_score": 10,
                    "completeness_score": 10,
                    "reasoning": (
                        f"LLM returned malformed JSON. Neutral fallback scores assigned. "
                        f"Raw output (truncated): {raw_llm_output[:200]}"
                    )
                })

        # ──────────────────────────────────────────────────────────────
        def validator_fn(leader_result: str) -> bool:
            """
            Called on each VALIDATOR node with the leader's result.
            Each validator independently runs leader_fn(), then checks
            whether its own result is semantically equivalent to the
            leader's — NOT a raw string comparison.

            CONSENSUS RULE:
              Accept if |leader_total − validator_total| ≤ SCORE_VARIANCE_TOLERANCE
              AND no single axis diverges by more than 3 pts.
            """
            try:
                leader_str = leader_result.calldata if hasattr(leader_result, 'calldata') else leader_result
                leader_data = json.loads(leader_str)
            except (json.JSONDecodeError, ValueError, TypeError):
                return False   # Unparseable → reject

            # If leader reported a known error path, accept it
            if "error" in leader_data:
                allowed_errors = {
                    "URL_FETCH_FAILED",
                    "PAGE_CONTENT_TOO_SHORT",
                    "JSON_PARSE_FAILED",
                }
                error_str = str(leader_data.get("error", ""))
                if any(code in error_str for code in allowed_errors):
                    return True
                return False

            # ── Step B: Extract leader's scores ───────────────────────
            try:
                leader_tech  = int(leader_data.get("tech_score", -1))
                leader_ui    = int(leader_data.get("ui_score", -1))
                leader_comp  = int(leader_data.get("completeness_score", -1))
                leader_total = leader_tech + leader_ui + leader_comp
            except (TypeError, ValueError):
                return False

            for score in [leader_tech, leader_ui, leader_comp]:
                if score < 0 or score > MAX_AXIS_SCORE:
                    return False

            # ── Step C: Run validator's independent evaluation ─────────
            # Each validator node independently fetches the URL and runs
            # the LLM, producing its own candidate scorecard.
            validator_raw = leader_fn()

            try:
                validator_data = json.loads(validator_raw)
            except (json.JSONDecodeError, ValueError):
                return True   # Abstain — validator node issue

            if "error" in validator_data:
                return True   # Abstain — validator fetch/parse error

            # ── Step D: Semantic score comparison ─────────────────────
            try:
                val_tech  = int(validator_data.get("tech_score", 0))
                val_ui    = int(validator_data.get("ui_score", 0))
                val_comp  = int(validator_data.get("completeness_score", 0))
                val_total = val_tech + val_ui + val_comp
            except (TypeError, ValueError):
                return True   # Abstain

            score_delta = abs(leader_total - val_total)

            # ── Step E: Consensus decision ─────────────────────────────
            # Per-axis guard: reject if any axis diverges by more than 3 pts
            # (tightened to prevent score-swapping attacks and ensure scorecard agreement)
            if abs(leader_tech - val_tech) > 3:
                return False
            if abs(leader_ui - val_ui) > 3:
                return False
            if abs(leader_comp - val_comp) > 3:
                return False

            # Accept if total difference ≤ tolerance
            if score_delta <= SCORE_VARIANCE_TOLERANCE:
                return True   # CONSENSUS REACHED

            return False   # CONSENSUS FAILED

        # ── Execute the non-deterministic block ────────────────────────
        # run_nondet_unsafe orchestrates the leader/validator protocol.
        # The leader_fn result is committed to the chain only when
        # enough validators agree (consensus threshold met).
        result_json: str = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        # ── Persist the scorecard to on-chain storage ──────────────────
        try:
            scorecard = json.loads(result_json)
        except (json.JSONDecodeError, ValueError):
            raise UserError("Consensus produced malformed scorecard JSON.")

        tech  = int(scorecard.get("tech_score", 0))
        ui    = int(scorecard.get("ui_score", 0))
        comp  = int(scorecard.get("completeness_score", 0))
        total = tech + ui + comp

        # Cast pid to u64 key type; values auto-coerced to i32
        self.scores_tech[pid]         = tech
        self.scores_ui[pid]           = ui
        self.scores_completeness[pid] = comp
        self.scores_total[pid]        = total
        self.scores_reasoning[pid]    = str(scorecard.get("reasoning", ""))
        self.is_judged[pid]           = True


    # ═══════════════════════════════════════════════════════════════════
    # ORGANIZER: FINALIZE — CALCULATE & LOCK PRIZE DISTRIBUTION
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def finalize_hackathon(self) -> None:
        """
        After all projects are judged, call this to:
          1. Rank all judged submissions by total score.
          2. Allocate prize_pool_wei: 1st=50%, 2nd=30%, 3rd=20%.
          3. Lock allocations into prize_claims TreeMap.
          4. Set is_finalized = True.
        Only the organizer can call this.
        """
        if gl.message.sender_address != self.organizer:
            raise UserError("Only the organizer can finalize the hackathon.")

        if self.is_finalized:
            raise UserError("Hackathon is already finalized.")

        if not self.is_setup:
            raise UserError("Hackathon has not been configured.")

        # Enforce that finalization can only happen after the submission deadline
        if int(time.time()) < int(self.submission_deadline):
            raise UserError("Cannot finalize the hackathon before the submission deadline.")

        # Build a sortable plain Python list from TreeMap data.
        # Cast u64 → int for range(); cast i32 scores → int for sorting.
        judged_entries: list = []   # [(total_score:int, pid:int, owner:str)]

        for pid in range(int(self.submission_count)):
            if self.is_judged.get(pid, False):
                total = int(self.scores_total.get(pid, 0))
                owner = self.submission_owners.get(pid, "")
                judged_entries.append((total, pid, owner))

        if len(judged_entries) == 0:
            raise UserError("No projects have been judged yet.")

        # Sort descending by score; tie-break: earlier submission wins
        judged_entries.sort(key=lambda x: (-x[0], x[1]))

        # ── Prize allocation (integer math only — no floats, Rule 3) ──
        # Cast u256 pool → int for arithmetic; results auto-coerce back to u256
        pool      = int(self.prize_pool_wei)
        prize_1st = (pool * 50) // 100
        prize_2nd = (pool * 30) // 100
        prize_3rd = (pool * 20) // 100
        # Dust (rounding remainder) goes to 1st place to avoid wei loss
        dust      = pool - (prize_1st + prize_2nd + prize_3rd)
        prize_1st += dust

        prizes      = [prize_1st, prize_2nd, prize_3rd]
        num_winners = min(MAX_WINNERS, len(judged_entries))

        for rank in range(num_winners):
            _, _, owner_addr = judged_entries[rank]
            existing = int(self.prize_claims.get(owner_addr, 0))
            # Accumulate if the same address appears in multiple podium spots
            self.prize_claims[owner_addr] = existing + prizes[rank]
            self.has_claimed[owner_addr]  = False

        self.is_finalized = True


    # ═══════════════════════════════════════════════════════════════════
    # WINNER: CLAIM PRIZE
    # ═══════════════════════════════════════════════════════════════════
    @gl.public.write
    def claim_prize(self) -> int:
        """
        Winners call this after finalization to retrieve their prize amount.
        Returns the claimable wei amount for the caller.
        In production this would trigger token.transfer(); here it returns
        the amount and marks the claim as processed (re-entrancy safe).
        """
        if not self.is_finalized:
            raise UserError("Hackathon is not yet finalized.")

        caller = str(gl.message.sender_address)
        amount = int(self.prize_claims.get(caller, 0))  # u256 → int for comparison

        if amount == 0:
            raise UserError("No prize available for this address.")

        if self.has_claimed.get(caller, False):
            raise UserError("Prize already claimed.")

        # Mark as claimed before returning (re-entrancy protection)
        self.has_claimed[caller] = True

        # Perform the actual transfer of GEN tokens via EVM interface
        recipient = Recipient(gl.message.sender_address)
        recipient.emit_transfer(value=u256(amount), on='finalized')

        return amount   # plain int return (Rule 4)


    # ═══════════════════════════════════════════════════════════════════
    # VIEW FUNCTIONS (read-only — no state changes)
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.view
    def get_submission_count(self) -> int:
        """Returns total number of registered submissions."""
        return int(self.submission_count)

    @gl.public.view
    def get_prize_pool(self) -> int:
        """Returns the total prize pool in wei units."""
        return int(self.prize_pool_wei)

    @gl.public.view
    def get_hackathon_name(self) -> str:
        """Returns the hackathon display name."""
        return self.hackathon_name

    @gl.public.view
    def get_is_finalized(self) -> bool:
        """Returns True if prizes have been locked in."""
        return self.is_finalized

    @gl.public.view
    def get_project_url(self, pid: int) -> str:
        """Returns the submitted URL for a given project ID."""
        if pid < 0 or pid >= int(self.submission_count):
            raise UserError(f"Invalid project ID: {pid}.")
        return self.submission_urls.get(pid, "")

    @gl.public.view
    def get_project_name(self, pid: int) -> str:
        """Returns the project name for a given project ID."""
        if pid < 0 or pid >= int(self.submission_count):
            raise UserError(f"Invalid project ID: {pid}.")
        return self.submission_names.get(pid, "")

    @gl.public.view
    def get_score(self, pid: int) -> str:
        """
        Returns the full scorecard as a JSON string for a given project ID.
        Scores are -1 if the project has not yet been judged.
        """
        if pid < 0 or pid >= int(self.submission_count):
            raise UserError(f"Invalid project ID: {pid}.")

        scorecard = {
            "pid":                pid,
            "project_name":       self.submission_names.get(pid, ""),
            "submitter":          self.submission_owners.get(pid, ""),
            "is_judged":          self.is_judged.get(pid, False),
            "tech_score":         int(self.scores_tech.get(pid, -1)),
            "ui_score":           int(self.scores_ui.get(pid, -1)),
            "completeness_score": int(self.scores_completeness.get(pid, -1)),
            "total_score":        int(self.scores_total.get(pid, -1)),
            "reasoning":          self.scores_reasoning.get(pid, ""),
        }
        return json.dumps(scorecard)

    @gl.public.view
    def get_prize_claim(self, addr: str) -> int:
        """Returns the prize amount (wei) allocated to the given address."""
        return int(self.prize_claims.get(addr, 0))

    @gl.public.view
    def get_leaderboard(self) -> str:
        """
        Returns a JSON array of all judged projects sorted by total score (desc).
        Used by the frontend to render the live leaderboard.
        """
        entries: list = []
        for pid in range(int(self.submission_count)):
            if self.is_judged.get(pid, False):
                entries.append({
                    "pid":                pid,
                    "project_name":       self.submission_names.get(pid, ""),
                    "submitter":          self.submission_owners.get(pid, ""),
                    "tech_score":         int(self.scores_tech.get(pid, 0)),
                    "ui_score":           int(self.scores_ui.get(pid, 0)),
                    "completeness_score": int(self.scores_completeness.get(pid, 0)),
                    "total_score":        int(self.scores_total.get(pid, 0)),
                    "reasoning":          self.scores_reasoning.get(pid, ""),
                })

        # Sort descending by total_score; ascending pid as tie-breaker
        entries.sort(key=lambda x: (-x["total_score"], x["pid"]))
        return json.dumps(entries)

    @gl.public.view
    def get_organizer(self) -> str:
        """Returns the organizer address as a string."""
        return str(self.organizer)
