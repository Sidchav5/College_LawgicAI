import joblib

LE_PKL = r"D:\SEM5\ML\CP\frontend\src\Final\model\label_encoder.pkl"
label_encoder = joblib.load(LE_PKL)
print("Classes:", label_encoder.classes_)
