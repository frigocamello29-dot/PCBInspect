"""Unit tests for PCBDefectDetector and MockPCBDefectDetector."""
import os
from pathlib import Path

import numpy as np
import pytest

from app.ml.detector import (
    DEFECT_CLASSES,
    DetectionResult,
    MockPCBDefectDetector,
    PCBDefectDetector,
    _nms,
)

MODEL_PATH = Path(__file__).parents[2] / "ml" / "models" / "pcb_defect_v1.onnx"
SKIP_REAL = not MODEL_PATH.exists()


def test_nms_empty():
    assert _nms(np.zeros((0, 4)), np.array([])) == []


def test_nms_no_overlap():
    boxes = np.array([[0, 0, 10, 10], [50, 50, 10, 10]], dtype=float)
    scores = np.array([0.9, 0.8])
    keep = _nms(boxes, scores)
    assert sorted(keep) == [0, 1]


def test_nms_full_overlap_keeps_highest():
    boxes = np.array([[0, 0, 10, 10], [0, 0, 10, 10]], dtype=float)
    scores = np.array([0.7, 0.9])
    keep = _nms(boxes, scores)
    assert keep == [1]


def test_mock_returns_list():
    det = MockPCBDefectDetector()
    img = np.zeros((300, 400, 3), dtype=np.uint8)
    results = det.predict(img)
    assert isinstance(results, list)


def test_mock_results_valid_fields():
    det = MockPCBDefectDetector()
    img = np.zeros((300, 400, 3), dtype=np.uint8)
    for _ in range(20):  # run enough times to get ≥1 result
        results = det.predict(img)
        for r in results:
            assert isinstance(r, DetectionResult)
            assert r.class_id in DEFECT_CLASSES
            assert 0.5 <= r.confidence <= 1.0
            assert r.bbox["x1"] < r.bbox["x2"]
            assert r.bbox["y1"] < r.bbox["y2"]
            assert r.bbox["x2"] <= 400
            assert r.bbox["y2"] <= 300


def test_mock_no_model_path_needed():
    det = MockPCBDefectDetector(model_path="does_not_exist.onnx")
    result = det.predict(np.zeros((100, 100, 3), dtype=np.uint8))
    assert isinstance(result, list)


@pytest.mark.skipif(SKIP_REAL, reason="ONNX model not present")
def test_real_detector_loads():
    det = PCBDefectDetector(str(MODEL_PATH))
    assert det.session is not None


@pytest.mark.skipif(SKIP_REAL, reason="ONNX model not present")
def test_real_detector_returns_list_on_blank_image():
    det = PCBDefectDetector(str(MODEL_PATH), conf_threshold=0.5)
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    results = det.predict(img)
    assert isinstance(results, list)


@pytest.mark.skipif(SKIP_REAL, reason="ONNX model not present")
def test_real_detector_result_fields():
    det = PCBDefectDetector(str(MODEL_PATH), conf_threshold=0.01)
    img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    results = det.predict(img)
    for r in results:
        assert isinstance(r, DetectionResult)
        assert r.class_id in DEFECT_CLASSES
        assert 0.0 <= r.confidence <= 1.0
        assert r.bbox["x1"] >= 0
        assert r.bbox["y1"] >= 0
        assert r.bbox["x2"] <= 640
        assert r.bbox["y2"] <= 480
        assert r.bbox["x1"] < r.bbox["x2"]
        assert r.bbox["y1"] < r.bbox["y2"]


@pytest.mark.skipif(SKIP_REAL, reason="ONNX model not present")
def test_real_detector_handles_non_square_image():
    det = PCBDefectDetector(str(MODEL_PATH), conf_threshold=0.5)
    img = np.zeros((300, 800, 3), dtype=np.uint8)
    results = det.predict(img)
    assert isinstance(results, list)
    for r in results:
        assert r.bbox["x2"] <= 800
        assert r.bbox["y2"] <= 300


@pytest.mark.skipif(SKIP_REAL, reason="ONNX model not present")
def test_real_detector_conf_threshold_filters():
    det_low = PCBDefectDetector(str(MODEL_PATH), conf_threshold=0.01)
    det_high = PCBDefectDetector(str(MODEL_PATH), conf_threshold=0.99)
    img = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
    assert len(det_low.predict(img)) >= len(det_high.predict(img))
