"""
Unit tests for the classifier module.

LangChain is not required to be installed for these tests — the chain is
replaced with a simple mock object before any real request is made.
They verify the data-flow logic (correct fields returned, correct types),
not the quality of the LLM responses.
"""

import app.classifier as classifier_module
from app.classifier import ExpenseClassification, classify


class _MockChain:
    """Stand-in for a LangChain Runnable that returns a preset result."""

    def __init__(self, result: ExpenseClassification):
        self._result = result

    async def ainvoke(self, _input):
        return self._result


async def test_expense_message():
    """A clear expense message should be classified as is_expense=True with valid fields."""
    classifier_module._chain = _MockChain(
        ExpenseClassification(is_expense=True, description="Pizza", amount=20.0, category="Food")
    )

    result = await classify("Pizza 20 bucks")

    assert result.is_expense is True
    assert result.amount == 20.0
    assert result.description == "Pizza"
    assert result.category in [
        "Housing", "Transportation", "Food", "Utilities", "Insurance",
        "Medical/Healthcare", "Savings", "Debt", "Education", "Entertainment", "Other",
    ]


async def test_non_expense_message():
    """A greeting should be classified as is_expense=False with empty fields."""
    classifier_module._chain = _MockChain(
        ExpenseClassification(is_expense=False, description="", amount=0.0, category="")
    )

    result = await classify("Hello, how are you?")

    assert result.is_expense is False
    assert result.amount == 0.0
    assert result.description == ""
    assert result.category == ""
