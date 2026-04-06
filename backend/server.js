const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/erp")
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.log(err));

/* ================= MODELS ================= */

// Student
const Student = mongoose.model("Student", new mongoose.Schema({
  name: String,
  className: String,
  section: String,
  rollNo: String,
  guardian: String,
  phone: String,
  feeStatus: { type: String, default: "Pending" }
}));

// Fee
const Fee = mongoose.model("Fee", new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  amount: Number,
  status: String,
  date: String
}));

// Attendance
const Attendance = mongoose.model("Attendance", new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", unique: true },
  status: { type: String, default: "Present" }
}));

// Settings
const Setting = mongoose.model("Setting", new mongoose.Schema({
  teacherCount: Number
}));

/* ================= API ================= */

// 🔥 Bootstrap (dashboard load)
app.get("/api/bootstrap", async (req, res) => {
  const students = await Student.find();
  const fees = await Fee.find().populate("studentId", "name");
  const attendance = await Attendance.find();
  const setting = await Setting.findOne();

  res.json({
    students,
    fees,
    attendance,
    teacherCount: setting?.teacherCount || 0
  });
});

// ================= STUDENTS =================
app.get("/api/students", async (req, res) => {
  res.json(await Student.find());
});

app.post("/api/students", async (req, res) => {
  const student = await Student.create(req.body);
  await Attendance.create({ studentId: student._id });
  res.json(student);
});

app.put("/api/students/:id", async (req, res) => {
  const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

app.delete("/api/students/:id", async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  await Attendance.deleteOne({ studentId: req.params.id });
  await Fee.deleteMany({ studentId: req.params.id });
  res.send("Deleted");
});

// ================= FEES =================
app.post("/api/fees", async (req, res) => {
  const fee = await Fee.create({
    ...req.body,
    date: new Date().toISOString().slice(0, 10)
  });

  await Student.findByIdAndUpdate(req.body.studentId, {
    feeStatus: req.body.status
  });

  res.json(await fee.populate("studentId", "name"));
});

// ================= ATTENDANCE =================
app.put("/api/attendance/:id", async (req, res) => {
  const att = await Attendance.findOneAndUpdate(
    { studentId: req.params.id },
    { status: req.body.status },
    { new: true, upsert: true }
  );
  res.json(att);
});

// ================= SETTINGS =================
app.patch("/api/settings/teachers", async (req, res) => {
  const data = await Setting.findOneAndUpdate(
    {},
    { teacherCount: req.body.teacherCount },
    { new: true, upsert: true }
  );
  res.json(data);
});

app.listen(5000, () => {
  console.log("Server running on port 5000 🔥");
});
