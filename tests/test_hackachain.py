"""
HackaChain Test Suite
=====================
Simulates the full contract lifecycle and edge-case handling.
These tests exercise the contract logic directly (no GenLayer runtime needed);
for full on-chain consensus tests, deploy to GenLayer Testnet and use the
GenLayer Studio CLI.

Run:
    python tests/test_hackachain.py
"""

import json
import sys
import os
import time

# ─── Minimal GenLayer SDK mock ─────────────────────────────────────────────
# This lets us run the contract logic locally without a live GenLayer node.
# In CI, replace with the real genlayer-test-sdk when available.

class _MockAddress:
    def __init__(self, addr: str):
        self._addr = addr
    def __str__(self): return self._addr
    def __eq__(self, other): return str(self) == str(other)
    def __ne__(self, other): return not self.__eq__(other)

class _MockTreeMap(dict):
    """Behaves like GenLayer TreeMap but is backed by a plain dict for tests."""
    def __setitem__(self, key, value): super().__setitem__(key, value)
    def get(self, key, default=None): return super().get(key, default)

class UserError(Exception): pass

class _WriteDecorator:
    def __call__(self, func): return func
    def payable(self, func): return func

class _MockContractRef:
    transfers = [] # class-level tracking list
    def __init__(self, address):
        self.address = address
    def emit_transfer(self, value, on):
        self.transfers.append((str(self.address), int(value), on))

class _MockGL:
    class message:
        sender_address = _MockAddress("0xORGANIZER000")
        value = 0

    class public:
        write = _WriteDecorator()
        @staticmethod
        def view(func): return func

    class nondet:
        class web:
            @staticmethod
            def render(url: str) -> str:
                """Fake web scrape — returns a realistic project description."""
                if "404" in url or "bad" in url:
                    raise ConnectionError("HTTP 404 – page not found")
                return f"""
                Project: Awesome DeFi Dashboard
                GitHub: https://github.com/example/defi-dashboard
                Tech Stack: React, Solidity, TheGraph, IPFS, Hardhat
                Live Demo: https://defi-dashboard.vercel.app
                Screenshots: [3 screenshots attached]
                Test Coverage: 87%
                Description: A comprehensive DeFi analytics dashboard that aggregates
                data from Uniswap, Aave, and Compound in real-time. Features wallet
                portfolio tracking, yield optimization suggestions, and gas price alerts.
                Built during ETHGlobal 2024. Won Best DeFi Award.
                """

        @staticmethod
        def exec_prompt(prompt: str) -> str:
            """Fake LLM response — returns valid scorecard JSON."""
            return json.dumps({
                "tech_score": 26,
                "ui_score": 22,
                "completeness_score": 24,
                "reasoning": (
                    "Excellent technical depth with a robust multi-protocol DeFi integration "
                    "using The Graph for indexing and IPFS for decentralised storage. "
                    "The UI shows strong polish with 3 screenshots and a live deployment; "
                    "87% test coverage demonstrates production-readiness."
                )
            })

    class vm:
        @staticmethod
        def run_nondet_unsafe(leader_fn, validator_fn):
            result = leader_fn()
            assert validator_fn(result), "Validator rejected leader result!"
            return result

    class Contract:
        def __new__(cls, *args, **kwargs):
            instance = super().__new__(cls)
            # Auto-initialize TreeMap and DynArray fields from type annotations
            annotations = getattr(cls, '__annotations__', {})
            for name, type_hint in annotations.items():
                type_str = str(type_hint)
                if 'TreeMap' in type_str:
                    setattr(instance, name, _MockTreeMap())
                elif 'DynArray' in type_str or 'list' in type_str:
                    setattr(instance, name, [])
            return instance

    @staticmethod
    def get_contract_at(address):
        return _MockContractRef(address)

# Sized integer mocks to avoid NameError when evaluating contract annotations
u256 = int
u64 = int
i32 = int

# Inject mock into sys.modules so the contract's `from genlayer import *` works
import types
mock_module = types.ModuleType("genlayer")
mock_module.Contract = _MockGL.Contract
mock_module.gl = _MockGL
mock_module.UserError = UserError
mock_module.Address = _MockAddress
mock_module.TreeMap = _MockTreeMap
mock_module.DynArray = list
mock_module.u256 = u256
mock_module.u64 = u64
mock_module.i32 = i32

# Patch `from genlayer import *` by making `gl` available in builtins
import builtins
builtins.gl = _MockGL
builtins.UserError = UserError
builtins.Address = _MockAddress
builtins.TreeMap = _MockTreeMap
builtins.DynArray = list
builtins.u256 = u256
builtins.u64 = u64
builtins.i32 = i32
sys.modules["genlayer"] = mock_module

# ─── Load the contract under test ──────────────────────────────────────────
contract_path = os.path.join(os.path.dirname(__file__), "..", "contracts", "HackaChain.py")
contract_src  = open(contract_path, encoding="utf-8").read()

# Strip the two mandatory header comment lines before exec
lines = contract_src.splitlines()
clean_lines = [l for l in lines if not l.startswith("# v0.2.16") and not l.startswith("# { \"Depends\"")]
exec_src = "\n".join(clean_lines)

contract_ns = {}
exec(compile(exec_src, "HackaChain.py", "exec"), contract_ns)
ContractClass = contract_ns["Contract"]


# ─── Test Harness ──────────────────────────────────────────────────────────

PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"
results = []

def run_test(name: str, fn):
    try:
        fn()
        print(f"  {PASS}  {name}")
        results.append((name, True, None))
    except AssertionError as e:
        print(f"  {FAIL}  {name}  → AssertionError: {e}")
        results.append((name, False, str(e)))
    except Exception as e:
        print(f"  {FAIL}  {name}  → {type(e).__name__}: {e}")
        results.append((name, False, f"{type(e).__name__}: {e}"))

def fresh_contract(sender="0xORGANIZER000") -> ContractClass:
    """Create a fresh contract instance with the given sender."""
    _MockGL.message.sender_address = _MockAddress(sender)
    c = ContractClass()
    return c

def setup(c) -> ContractClass:
    """Run setup_hackathon with default params."""
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    _MockGL.message.value = 1_000_000
    now = int(time.time())
    c.setup_hackathon(
        name="ETHGlobal Hackathon 2025",
        prize_pool_wei=1_000_000,
        submission_deadline=now + 86400,   # +1 day
        judging_deadline=now + 172800,     # +2 days
    )
    return c

def submit(c, name="DeFi Dashboard", url="https://github.com/example/defi", sender="0xPARTICIPANT1") -> int:
    _MockGL.message.sender_address = _MockAddress(sender)
    return c.submit_project(name, url)


# ═══════════════════════════════════════════════════════════════════════════
# TEST GROUP 1: Setup & Access Control
# ═══════════════════════════════════════════════════════════════════════════
print("\n\033[1m📋 Group 1: Setup & Access Control\033[0m")

def test_setup_happy_path():
    c = fresh_contract()
    setup(c)
    assert c.is_setup is True
    assert c.hackathon_name == "ETHGlobal Hackathon 2025"
    assert c.prize_pool_wei == 1_000_000

def test_setup_rejects_non_organizer():
    c = fresh_contract()
    _MockGL.message.sender_address = _MockAddress("0xSTRANGER")
    _MockGL.message.value = 100
    try:
        c.setup_hackathon("Hack", 100, 1, 2)
        assert False, "Should have raised UserError"
    except UserError as e:
        assert "organizer" in str(e).lower()

def test_setup_cannot_be_called_twice():
    c = fresh_contract()
    setup(c)
    try:
        setup(c)
        assert False, "Should have raised UserError"
    except UserError as e:
        assert "already" in str(e).lower()

def test_setup_rejects_zero_prize():
    c = fresh_contract()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    _MockGL.message.value = 0
    try:
        c.setup_hackathon("Hack", 0, 1, 2)
        assert False
    except UserError:
        pass

def test_setup_rejects_invalid_deadlines():
    c = fresh_contract()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    _MockGL.message.value = 100
    try:
        # judging_deadline <= submission_deadline
        c.setup_hackathon("Hack", 100, 1000, 500)
        assert False
    except UserError:
        pass

for fn in [test_setup_happy_path, test_setup_rejects_non_organizer,
           test_setup_cannot_be_called_twice, test_setup_rejects_zero_prize,
           test_setup_rejects_invalid_deadlines]:
    run_test(fn.__name__, fn)


# ═══════════════════════════════════════════════════════════════════════════
# TEST GROUP 2: Submission
# ═══════════════════════════════════════════════════════════════════════════
print("\n\033[1m📋 Group 2: Project Submission\033[0m")

def test_submit_returns_pid():
    c = fresh_contract(); setup(c)
    pid = submit(c)
    assert pid == 0

def test_submit_increments_count():
    c = fresh_contract(); setup(c)
    submit(c, sender="0xA")
    submit(c, "Proj2", "https://proj2.io", "0xB")
    assert c.submission_count == 2

def test_submit_stores_data():
    c = fresh_contract(); setup(c)
    pid = submit(c, "CoolApp", "https://coolapp.dev")
    assert c.submission_urls.get(pid) == "https://coolapp.dev"
    assert c.submission_names.get(pid) == "CoolApp"

def test_submit_initialises_scores_to_minus_one():
    c = fresh_contract(); setup(c)
    pid = submit(c)
    assert c.scores_tech.get(pid) == -1
    assert c.scores_total.get(pid) == -1
    assert c.is_judged.get(pid) is False

def test_submit_rejects_empty_url():
    c = fresh_contract(); setup(c)
    _MockGL.message.sender_address = _MockAddress("0xA")
    try:
        c.submit_project("Name", "")
        assert False
    except UserError:
        pass

def test_submit_before_setup_raises():
    c = fresh_contract()
    try:
        submit(c)
        assert False
    except UserError as e:
        assert "not been configured" in str(e)

for fn in [test_submit_returns_pid, test_submit_increments_count,
           test_submit_stores_data, test_submit_initialises_scores_to_minus_one,
           test_submit_rejects_empty_url, test_submit_before_setup_raises]:
    run_test(fn.__name__, fn)


# ═══════════════════════════════════════════════════════════════════════════
# TEST GROUP 3: AI Judging (Non-Deterministic Logic)
# ═══════════════════════════════════════════════════════════════════════════
print("\n\033[1m📋 Group 3: AI Judging & Consensus\033[0m")

def test_judge_scores_project():
    c = fresh_contract(); setup(c)
    pid = submit(c)
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.judge_project(pid)
    assert c.is_judged.get(pid) is True
    assert c.scores_tech.get(pid) == 26
    assert c.scores_ui.get(pid) == 22
    assert c.scores_completeness.get(pid) == 24
    assert c.scores_total.get(pid) == 72

def test_judge_persists_reasoning():
    c = fresh_contract(); setup(c)
    pid = submit(c)
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.judge_project(pid)
    reasoning = c.scores_reasoning.get(pid, "")
    assert len(reasoning) > 20

def test_judge_rejects_non_organizer():
    c = fresh_contract(); setup(c)
    pid = submit(c)
    _MockGL.message.sender_address = _MockAddress("0xHACKER")
    try:
        c.judge_project(pid)
        assert False
    except UserError as e:
        assert "organizer" in str(e).lower()

def test_judge_rejects_double_judging():
    c = fresh_contract(); setup(c)
    pid = submit(c)
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.judge_project(pid)
    try:
        c.judge_project(pid)
        assert False
    except UserError as e:
        assert "already been judged" in str(e)

def test_judge_handles_bad_url_gracefully():
    """Contract must not crash when URL returns 404; scores 0 and records error."""
    # Temporarily patch web.render to raise
    original_web = _MockGL.nondet.web

    class _BadFetch:
        @staticmethod
        def render(url):
            raise ConnectionError("HTTP 404")

    class _PatchedNondet:
        web = _BadFetch()
        exec_prompt = _MockGL.nondet.exec_prompt

    _MockGL.nondet = _PatchedNondet

    try:
        c = fresh_contract(); setup(c)
        pid = submit(c, url="https://bad-url-404.example")
        _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
        c.judge_project(pid)
        # Contract should succeed with zero scores
        assert c.is_judged.get(pid) is True
        assert c.scores_total.get(pid) == 0
    finally:
        # Restore original
        class _RestoredNondet:
            web = original_web
            exec_prompt = _MockGL.nondet.exec_prompt
        _MockGL.nondet = _RestoredNondet

def test_judge_invalid_pid_raises():
    c = fresh_contract(); setup(c)
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    try:
        c.judge_project(99)
        assert False
    except UserError as e:
        assert "Invalid project ID" in str(e)

def test_get_score_returns_json():
    c = fresh_contract(); setup(c)
    pid = submit(c)
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.judge_project(pid)
    score_json = c.get_score(pid)
    scorecard = json.loads(score_json)
    assert scorecard["pid"] == pid
    assert scorecard["is_judged"] is True
    assert scorecard["total_score"] == 72

for fn in [test_judge_scores_project, test_judge_persists_reasoning,
           test_judge_rejects_non_organizer, test_judge_rejects_double_judging,
           test_judge_invalid_pid_raises, test_get_score_returns_json]:
    run_test(fn.__name__, fn)


# ═══════════════════════════════════════════════════════════════════════════
# TEST GROUP 4: Finalization & Prize Distribution
# ═══════════════════════════════════════════════════════════════════════════
print("\n\033[1m📋 Group 4: Finalization & Prize Distribution\033[0m")

def _judged_contract_3_projects():
    """Helper: contract with 3 judged projects scoring 72, 60, 45."""
    c = fresh_contract(); setup(c)

    # Patch exec_prompt to return different scores based on the project evaluated
    def multi_prompt(prompt):
        if "Project 0" in prompt:
            return json.dumps({"tech_score": 26, "ui_score": 22, "completeness_score": 24, "reasoning": "Top project."})
        elif "Project 1" in prompt:
            return json.dumps({"tech_score": 20, "ui_score": 20, "completeness_score": 20, "reasoning": "Mid project."})
        elif "Project 2" in prompt:
            return json.dumps({"tech_score": 15, "ui_score": 15, "completeness_score": 15, "reasoning": "Lower project."})
        return json.dumps({"tech_score": 26, "ui_score": 22, "completeness_score": 24, "reasoning": "Top project."})

    _MockGL.nondet.exec_prompt = multi_prompt

    pids = [
        submit(c, f"Project {i}", f"https://p{i}.dev", f"0xUSER{i}")
        for i in range(3)
    ]
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    for pid in pids:
        c.judge_project(pid)

    # Restore original mock
    _MockGL.nondet.exec_prompt = _MockGL_exec_prompt_orig
    c.submission_deadline = int(time.time()) - 10
    return c

_MockGL_exec_prompt_orig = _MockGL.nondet.exec_prompt

def test_finalize_sets_flag():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.finalize_hackathon()
    assert c.is_finalized is True

def test_finalize_prize_split():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.finalize_hackathon()
    # Pool = 1_000_000; 50/30/20 split
    # Winner[0] = 0xUSER0 (score 72) → 500_000
    # Winner[1] = 0xUSER1 (score 60) → 300_000
    # Winner[2] = 0xUSER2 (score 45) → 200_000
    assert c.prize_claims.get("0xUSER0") == 500_000
    assert c.prize_claims.get("0xUSER1") == 300_000
    assert c.prize_claims.get("0xUSER2") == 200_000

def test_finalize_dust_goes_to_first():
    """With a pool of 1_000_001 wei, the extra 1 should go to 1st place."""
    c = fresh_contract()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    _MockGL.message.value = 1_000_001
    now = int(time.time())
    c.setup_hackathon("Dust Test", 1_000_001, now + 1, now + 2)
    pid = submit(c)
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.judge_project(pid)
    c.submission_deadline = now - 1
    c.finalize_hackathon()
    # Only 1 project: gets 100% = 1_000_001
    assert c.prize_claims.get("0xPARTICIPANT1") == 1_000_001

def test_finalize_rejects_non_organizer():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xHACKER")
    try:
        c.finalize_hackathon()
        assert False
    except UserError:
        pass

def test_finalize_twice_raises():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.finalize_hackathon()
    try:
        c.finalize_hackathon()
        assert False
    except UserError as e:
        assert "already finalized" in str(e)

def test_submit_after_finalize_raises():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.finalize_hackathon()
    try:
        submit(c, sender="0xLATE")
        assert False
    except UserError as e:
        assert "finalized" in str(e).lower()

for fn in [test_finalize_sets_flag, test_finalize_prize_split,
           test_finalize_rejects_non_organizer, test_finalize_twice_raises,
           test_submit_after_finalize_raises]:
    run_test(fn.__name__, fn)


# ═══════════════════════════════════════════════════════════════════════════
# TEST GROUP 5: Prize Claiming
# ═══════════════════════════════════════════════════════════════════════════
print("\n\033[1m📋 Group 5: Prize Claiming\033[0m")

def test_claim_returns_amount():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.finalize_hackathon()
    _MockGL.message.sender_address = _MockAddress("0xUSER0")
    amount = c.claim_prize()
    assert amount == 500_000

def test_claim_marks_claimed():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.finalize_hackathon()
    _MockGL.message.sender_address = _MockAddress("0xUSER0")
    c.claim_prize()
    assert c.has_claimed.get("0xUSER0") is True

def test_double_claim_raises():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.finalize_hackathon()
    _MockGL.message.sender_address = _MockAddress("0xUSER0")
    c.claim_prize()
    try:
        c.claim_prize()
        assert False
    except UserError as e:
        assert "already claimed" in str(e)

def test_no_prize_raises():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.finalize_hackathon()
    _MockGL.message.sender_address = _MockAddress("0xNOBODY")
    try:
        c.claim_prize()
        assert False
    except UserError as e:
        assert "No prize" in str(e)

def test_claim_before_finalize_raises():
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xUSER0")
    try:
        c.claim_prize()
        assert False
    except UserError as e:
        assert "not yet finalized" in str(e)

for fn in [test_claim_returns_amount, test_claim_marks_claimed,
           test_double_claim_raises, test_no_prize_raises, test_claim_before_finalize_raises]:
    run_test(fn.__name__, fn)


# ═══════════════════════════════════════════════════════════════════════════
# TEST GROUP 6: View Functions
# ═══════════════════════════════════════════════════════════════════════════
print("\n\033[1m📋 Group 6: View / Read Functions\033[0m")

def test_get_leaderboard_sorted():
    c = _judged_contract_3_projects()
    board_json = c.get_leaderboard()
    board = json.loads(board_json)
    assert len(board) == 3
    # Must be sorted descending by total_score
    scores = [entry["total_score"] for entry in board]
    assert scores == sorted(scores, reverse=True)

def test_get_leaderboard_empty():
    c = fresh_contract(); setup(c)
    board = json.loads(c.get_leaderboard())
    assert board == []

def test_get_organizer():
    c = fresh_contract()
    assert c.get_organizer() == "0xORGANIZER000"

def test_get_prize_claim_zero_for_unknown():
    c = fresh_contract()
    assert c.get_prize_claim("0xRANDOM") == 0

def test_get_score_unjudged():
    c = fresh_contract(); setup(c)
    pid = submit(c)
    sc = json.loads(c.get_score(pid))
    assert sc["is_judged"] is False
    assert sc["tech_score"] == -1

for fn in [test_get_leaderboard_sorted, test_get_leaderboard_empty,
           test_get_organizer, test_get_prize_claim_zero_for_unknown,
           test_get_score_unjudged]:
    run_test(fn.__name__, fn)


# ═══════════════════════════════════════════════════════════════════════════
# TEST GROUP 7: Escrow, Deadlines & Token Claims
# ═══════════════════════════════════════════════════════════════════════════
print("\n\033[1m📋 Group 7: Escrow, Deadlines & Token Claims\033[0m")

def test_setup_rejects_mismatched_value():
    c = fresh_contract()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    _MockGL.message.value = 500  # Mismatched value
    try:
        c.setup_hackathon("Mismatched", 1000, 1, 2)
        assert False, "Should fail because value != prize_pool_wei"
    except UserError as e:
        assert "value does not match" in str(e).lower()

def test_submit_after_deadline_raises():
    c = fresh_contract()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    _MockGL.message.value = 1000
    now = int(time.time())
    c.setup_hackathon("Hack", 1000, now - 10, now + 10)
    try:
        submit(c, name="DeFi", url="https://defi.io", sender="0xUSER1")
        assert False, "Should fail because submission deadline passed"
    except UserError as e:
        assert "deadline has passed" in str(e).lower()

def test_judge_after_deadline_raises():
    c = fresh_contract()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    _MockGL.message.value = 1000
    now = int(time.time())
    c.setup_hackathon("Hack", 1000, now + 10, now + 20)
    pid = submit(c)
    
    # Simulate time passing past the judging deadline
    c.judging_deadline = now - 10
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    try:
        c.judge_project(pid)
        assert False, "Should fail because judging deadline passed"
    except UserError as e:
        assert "deadline has passed" in str(e).lower()

def test_finalize_before_submission_deadline_raises():
    c = fresh_contract()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    _MockGL.message.value = 1000
    now = int(time.time())
    c.setup_hackathon("Hack", 1000, now + 100, now + 200)
    try:
        c.finalize_hackathon()
        assert False, "Should fail because submission deadline not reached"
    except UserError as e:
        assert "before the submission deadline" in str(e).lower()

def test_claim_prize_performs_emit_transfer():
    _MockContractRef.transfers.clear()
    c = _judged_contract_3_projects()
    _MockGL.message.sender_address = _MockAddress("0xORGANIZER000")
    c.submission_deadline = int(time.time()) - 10
    c.finalize_hackathon()
    
    _MockGL.message.sender_address = _MockAddress("0xUSER0")
    amount = c.claim_prize()
    
    assert amount == 500_000
    assert len(_MockContractRef.transfers) == 1
    addr, val, on = _MockContractRef.transfers[0]
    assert addr == "0xUSER0"
    assert val == 500_000
    assert on == "finalized"

for fn in [test_setup_rejects_mismatched_value, test_submit_after_deadline_raises,
           test_judge_after_deadline_raises, test_finalize_before_submission_deadline_raises,
           test_claim_prize_performs_emit_transfer]:
    run_test(fn.__name__, fn)


# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "═" * 60)
total  = len(results)
passed = sum(1 for _, ok, _ in results if ok)
failed = total - passed

print(f"  Results: {passed}/{total} tests passed")
if failed:
    print(f"\n  Failed tests:")
    for name, ok, err in results:
        if not ok:
            print(f"    - {name}: {err}")
print("═" * 60 + "\n")

sys.exit(0 if failed == 0 else 1)
