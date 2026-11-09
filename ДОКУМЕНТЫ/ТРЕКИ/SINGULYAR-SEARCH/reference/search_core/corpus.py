"""Demo corpus for the simulator."""
from models import Evidence

DEMO_CORPUS = [
    Evidence("doc1", "Tech A compatible Tech B according to official documentation.", "Doc_2023", "2023-01-01", "2.0", 0.9, "support"),
    Evidence("doc2", "Tech A compatible Tech B — blog post review.", "Blog_Post", "2022-06-15", "1.0", 0.5, "support"),
    Evidence("doc3", "Tech A NOT compatible Tech B — see old manual.", "Old_Manual", "2015-03-01", "0.9", 0.3, "oppose"),
    Evidence("doc4", "Tech A and B integration fails — error log analysis.", "Error_Log", "2024-02-20", "3.1", 0.8, "oppose"),
]
