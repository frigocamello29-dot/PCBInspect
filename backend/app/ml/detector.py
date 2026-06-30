import random
from dataclasses import dataclass

import numpy as np


DEFECT_CLASSES = {
    1: "pin-hole",
    2: "Mouse Bite",
    3: "Open Circuit",
    4: "Short",
    5: "Spur",
    6: "Spurious Copper",
}

_INPUT_SIZE = 640


@dataclass
class DetectionResult:
    class_id: int
    class_name: str
    confidence: float
    bbox: dict  # {x1, y1, x2, y2}


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45) -> list[int]:
    """NMS. boxes: [N, 4] in x,y,w,h."""
    if len(boxes) == 0:
        return []
    x1, y1 = boxes[:, 0], boxes[:, 1]
    x2, y2 = x1 + boxes[:, 2], y1 + boxes[:, 3]
    areas = boxes[:, 2] * boxes[:, 3]
    order = scores.argsort()[::-1]
    keep: list[int] = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-9)
        order = order[np.where(iou <= iou_threshold)[0] + 1]
    return keep


class PCBDefectDetector:
    def __init__(self, model_path: str, conf_threshold: float = 0.5):
        import onnxruntime as ort
        self.session = ort.InferenceSession(model_path)
        self.conf_threshold = conf_threshold
        self._input_name = self.session.get_inputs()[0].name

    def predict(self, image: np.ndarray) -> list[DetectionResult]:
        from PIL import Image as PILImage

        h, w = image.shape[:2]

        pil = PILImage.fromarray(image).convert("RGB").resize(
            (_INPUT_SIZE, _INPUT_SIZE), PILImage.BILINEAR
        )
        x = np.array(pil, dtype=np.float32) / 255.0
        x = x.transpose(2, 0, 1)[np.newaxis]  # [1, 3, 640, 640]

        raw = self.session.run(None, {self._input_name: x})[0]  # [1, 10, 8400]

        preds = raw[0].T
        class_scores = preds[:, 4:]  # [8400, 6]
        class_ids = np.argmax(class_scores, axis=1)
        confidences = class_scores[np.arange(len(class_ids)), class_ids]

        mask = confidences >= self.conf_threshold
        preds_f = preds[mask]
        class_ids_f = class_ids[mask]
        confs_f = confidences[mask]

        if len(preds_f) == 0:
            return []

        scale_x, scale_y = w / _INPUT_SIZE, h / _INPUT_SIZE
        cx, cy, bw, bh = preds_f[:, 0], preds_f[:, 1], preds_f[:, 2], preds_f[:, 3]
        rx1 = (cx - bw / 2) * scale_x
        ry1 = (cy - bh / 2) * scale_y
        rw = bw * scale_x
        rh = bh * scale_y

        boxes = np.stack([rx1, ry1, rw, rh], axis=1)
        keep = _nms(boxes, confs_f, iou_threshold=0.45)

        _MODEL_TO_DEFECT_ID = {0: 3, 1: 4, 2: 2, 3: 5, 4: 6, 5: 1}

        results: list[DetectionResult] = []
        for i in keep:
            cid = _MODEL_TO_DEFECT_ID.get(int(class_ids_f[i]), int(class_ids_f[i]) + 1)
            results.append(DetectionResult(
                class_id=cid,
                class_name=DEFECT_CLASSES.get(cid, f"class_{cid}"),
                confidence=round(float(confs_f[i]), 4),
                bbox={
                    "x1": max(0, int(rx1[i])),
                    "y1": max(0, int(ry1[i])),
                    "x2": min(w, int(rx1[i] + rw[i])),
                    "y2": min(h, int(ry1[i] + rh[i])),
                },
            ))
        return results


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
