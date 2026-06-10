import random
from dataclasses import dataclass

import numpy as np


DEFECT_CLASSES = {
    1: "Missing Hole",
    2: "Mouse Bite",
    3: "Open Circuit",
    4: "Short",
    5: "Spur",
    6: "Spurious Copper",
}


@dataclass
class DetectionResult:
    class_id: int
    class_name: str
    confidence: float
    bbox: dict  # {x1, y1, x2, y2}


class PCBDefectDetector:
    def __init__(self, model_path: str, conf_threshold: float = 0.5):
        import onnxruntime as ort
        self.session = ort.InferenceSession(model_path)
        self.conf_threshold = conf_threshold

    def predict(self, image: np.ndarray) -> list[DetectionResult]:
        raise NotImplementedError


class MockPCBDefectDetector:
    def __init__(self, model_path: str = "", conf_threshold: float = 0.5):
        self.conf_threshold = conf_threshold

    def predict(self, image: np.ndarray) -> list[DetectionResult]:
        h, w = image.shape[:2] if image.ndim >= 2 else (640, 640)
        n = random.randint(0, 4)
        results = []
        for _ in range(n):
            class_id = random.randint(1, 6)
            x1 = random.randint(0, w - 50)
            y1 = random.randint(0, h - 50)
            x2 = x1 + random.randint(30, 100)
            y2 = y1 + random.randint(30, 100)
            results.append(DetectionResult(
                class_id=class_id,
                class_name=DEFECT_CLASSES[class_id],
                confidence=round(random.uniform(0.5, 0.99), 2),
                bbox={"x1": x1, "y1": y1, "x2": min(x2, w), "y2": min(y2, h)},
            ))
        return results
