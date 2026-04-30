from pydantic import BaseModel

from app.config import settings

CATEGORIES = [
    "Housing",
    "Transportation",
    "Food",
    "Utilities",
    "Insurance",
    "Medical/Healthcare",
    "Savings",
    "Debt",
    "Education",
    "Entertainment",
    "Other",
]

# Listed explicitly in the prompt so the model never invents a category
CATEGORIES_STR = ", ".join(CATEGORIES)

SYSTEM_PROMPT = f"""You are a personal finance assistant that classifies messages.

If the message describes an expense (a purchase, payment, or cost), extract:
- description: a short, clean English description (e.g. "Dinner at Mario's", not the raw message)
- amount: the numeric value only, no currency symbols (e.g. 20.5)
- category: one of [{CATEGORIES_STR}]
- is_expense: true

If the message is NOT an expense (greeting, question, unrelated text), return:
- is_expense: false
- description: ""
- amount: 0.0
- category: ""

Always respond with valid JSON matching the schema. Never invent categories outside the list."""


class ExpenseClassification(BaseModel):
    is_expense: bool
    description: str
    amount: float
    category: str


def _build_chain():
    # Langchain imports are deferred here so the module can be imported (and
    # its types used in tests) without langchain installed in the environment.
    from langchain_core.prompts import ChatPromptTemplate

    if settings.llm_provider == "groq":
        from langchain_groq import ChatGroq
        llm = ChatGroq(
            model=settings.llm_model,
            temperature=0,
            api_key=settings.llm_api_key,
        )
    else:
        from langchain_openai import ChatOpenAI
        llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=0,
            api_key=settings.llm_api_key,
        )
    structured_llm = llm.with_structured_output(ExpenseClassification)
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "{message}"),
        ]
    )
    return prompt | structured_llm


# None until first real request; tests replace this directly with a mock object
_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        _chain = _build_chain()
    return _chain


async def classify(message: str) -> ExpenseClassification:
    """Classify a message and extract expense details in a single LLM call."""
    return await _get_chain().ainvoke({"message": message})
