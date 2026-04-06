import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:5000/api";

const adminNavItems = [
  { key: "dashboard", label: "Admin Dashboard", icon: "DB" },
  { key: "students", label: "Student Management", icon: "ST" },
  { key: "attendance", label: "Attendance", icon: "AT" },
  { key: "fees", label: "Fees Management", icon: "FE" },
  { key: "timetable", label: "Timetable", icon: "TT" },
  { key: "notifications", label: "Notifications", icon: "NT" }
];

const studentNavItems = [
  { key: "dashboard", label: "Student Dashboard", icon: "DB" },
  { key: "attendance", label: "My Attendance", icon: "AT" },
  { key: "fees", label: "My Fees", icon: "FE" },
  { key: "timetable", label: "Timetable", icon: "TT" },
  { key: "notifications", label: "Notifications", icon: "NT" }
];

const recentActivities = [
  "New admission completed for Class 6 - Section B",
  "Mathematics attendance uploaded by Priya Ma'am",
  "Fee payment received from 14 students",
  "Science club notice published"
];

const attendanceTrend = [78, 82, 85, 81, 88, 90, 86, 89, 91, 93, 92, 94];
const feeTrend = [38, 45, 52, 49, 63, 69, 71, 75, 79, 84, 88, 93];

const notices = [
  { id: 1, title: "Parent-Teacher Meeting", body: "Scheduled on Friday at 10:30 AM in the school auditorium.", urgent: false },
  { id: 2, title: "Bus Route Delay", body: "Route B will be delayed by 20 minutes due to road maintenance.", urgent: true },
  { id: 3, title: "Exam Timetable Released", body: "Final exam timetable is published in the academic portal.", urgent: false }
];

const timetable = {
  Monday: ["Math", "English", "Science", "Break", "History", "Sports"],
  Tuesday: ["Biology", "Math", "Computer", "Break", "Geography", "Art"],
  Wednesday: ["Physics", "English", "Math", "Break", "Chemistry", "Music"],
  Thursday: ["History", "Science", "Computer", "Break", "Math", "Library"],
  Friday: ["Math", "Civics", "English", "Break", "Sports", "Robotics"]
};

const subjectPalette = {
  Math: "subject-blue",
  English: "subject-green",
  Science: "subject-teal",
  Break: "subject-amber",
  History: "subject-violet",
  Sports: "subject-mint",
  Biology: "subject-lime",
  Computer: "subject-cyan",
  Geography: "subject-rose",
  Art: "subject-orange",
  Physics: "subject-indigo",
  Chemistry: "subject-sky",
  Music: "subject-pink",
  Civics: "subject-sand",
  Library: "subject-gray",
  Robotics: "subject-aqua"
};

const mapStudent = (student) => ({
  id: student._id,
  name: student.name,
  className: student.className,
  section: student.section,
  rollNo: student.rollNo,
  guardian: student.guardian,
  phone: student.phone,
  feeStatus: student.feeStatus
});

const mapFee = (fee) => ({
  id: fee._id,
  receiptId: fee.receiptId,
  studentId: fee.studentId?._id || fee.studentId,
  student: fee.studentId?.name || "Unknown",
  amount: fee.amount,
  date: fee.date,
  status: fee.status
});

function App() {
  const [isDark, setIsDark] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState("admin");
  const [selectedStudentLoginId, setSelectedStudentLoginId] = useState("");

  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [students, setStudents] = useState([]);
  const [teacherCount, setTeacherCount] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [attendanceByStudent, setAttendanceByStudent] = useState({});

  const [syncLoading, setSyncLoading] = useState(true);
  const [syncError, setSyncError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudentId, setEditStudentId] = useState(null);

  const [studentForm, setStudentForm] = useState({
    name: "",
    className: "",
    section: "",
    rollNo: "",
    guardian: "",
    phone: "",
    feeStatus: "Paid"
  });
  const [studentFormErrors, setStudentFormErrors] = useState({});

  const [feeForm, setFeeForm] = useState({ studentId: "", amount: "", status: "Paid" });

  const isAdmin = authRole === "admin";
  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const loggedInStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentLoginId) || students[0],
    [students, selectedStudentLoginId]
  );

  const paidCount = students.filter((s) => s.feeStatus === "Paid").length;
  const pendingCount = students.length - paidCount;
  const attendancePercent = students.length
    ? Math.round((Object.values(attendanceByStudent).filter((status) => status === "Present").length / students.length) * 100)
    : 0;

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const text = `${s.name} ${s.rollNo}`.toLowerCase();
      const passesSearch = text.includes(searchTerm.toLowerCase());
      const passesClass = classFilter === "All" || s.className === classFilter;
      return passesSearch && passesClass;
    });
  }, [students, searchTerm, classFilter]);

  const classes = useMemo(() => ["All", ...new Set(students.map((s) => s.className))], [students]);

  const currentStudentPayments = paymentHistory.filter((p) => p.studentId === loggedInStudent?.id);

  const loadAllData = useCallback(async () => {
    setSyncLoading(true);
    setSyncError("");

    try {
      const response = await fetch(`${API_BASE}/bootstrap`);
      if (!response.ok) throw new Error("Failed to load dashboard data");
      const data = await response.json();

      const mappedStudents = data.students.map(mapStudent);
      const mappedFees = data.fees.map(mapFee);
      const attendanceMap = data.attendance.reduce((acc, item) => {
        const key = item.studentId?._id || item.studentId;
        acc[key] = item.status;
        return acc;
      }, {});

      setStudents(mappedStudents);
      setPaymentHistory(mappedFees);
      setAttendanceByStudent(attendanceMap);
      setTeacherCount(data.teacherCount || 0);

      setSelectedStudentLoginId((prev) => prev || mappedStudents[0]?.id || "");
      setFeeForm((prev) => ({ ...prev, studentId: prev.studentId || mappedStudents[0]?.id || "" }));
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setSyncLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const openAddStudent = () => {
    setEditStudentId(null);
    setStudentForm({
      name: "",
      className: "",
      section: "",
      rollNo: "",
      guardian: "",
      phone: "",
      feeStatus: "Paid"
    });
    setStudentFormErrors({});
    setStudentModalOpen(true);
  };

  const openEditStudent = (student) => {
    setEditStudentId(student.id);
    setStudentForm({ ...student });
    setStudentFormErrors({});
    setStudentModalOpen(true);
  };

  const validateStudentForm = () => {
    const errors = {};
    if (!studentForm.name.trim()) errors.name = "Name is required";
    if (!studentForm.className.trim()) errors.className = "Class is required";
    if (!studentForm.section.trim()) errors.section = "Section is required";
    if (!studentForm.rollNo.trim()) errors.rollNo = "Roll number is required";
    if (!studentForm.guardian.trim()) errors.guardian = "Guardian name is required";
    if (!/^\d{10}$/.test(studentForm.phone)) errors.phone = "Phone must be 10 digits";
    setStudentFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveStudent = async () => {
    if (!validateStudentForm()) return;

    try {
      if (editStudentId) {
        const response = await fetch(`${API_BASE}/students/${editStudentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(studentForm)
        });

        if (!response.ok) throw new Error("Failed to update student");
        const updated = mapStudent(await response.json());

        setStudents((prev) => prev.map((s) => (s.id === editStudentId ? updated : s)));
      } else {
        const response = await fetch(`${API_BASE}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(studentForm)
        });

        if (!response.ok) throw new Error("Failed to add student");
        const created = mapStudent(await response.json());

        setStudents((prev) => [...prev, created]);
        setAttendanceByStudent((prev) => ({ ...prev, [created.id]: "Present" }));
        setFeeForm((prev) => ({ ...prev, studentId: prev.studentId || created.id }));
      }

      setStudentModalOpen(false);
      setSyncError("");
    } catch (error) {
      setSyncError(error.message);
    }
  };

  const deleteStudent = async (studentId) => {
    try {
      const response = await fetch(`${API_BASE}/students/${studentId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete student");

      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      setPaymentHistory((prev) => prev.filter((p) => p.studentId !== studentId));
      setAttendanceByStudent((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });

      if (selectedStudentLoginId === studentId) {
        const fallback = students.find((s) => s.id !== studentId);
        setSelectedStudentLoginId(fallback?.id || "");
      }
    } catch (error) {
      setSyncError(error.message);
    }
  };

  const addFeeRecord = async () => {
    const amount = Number(feeForm.amount);
    if (!feeForm.studentId || !amount) return;

    try {
      const response = await fetch(`${API_BASE}/fees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: feeForm.studentId,
          amount,
          status: feeForm.status
        })
      });

      if (!response.ok) throw new Error("Failed to add fee record");
      const createdFee = mapFee(await response.json());

      setPaymentHistory((prev) => [createdFee, ...prev]);
      setStudents((prev) =>
        prev.map((s) =>
          s.id === feeForm.studentId
            ? {
                ...s,
                feeStatus: feeForm.status
              }
            : s
        )
      );
      setFeeForm((prev) => ({ ...prev, amount: "", status: "Paid" }));
    } catch (error) {
      setSyncError(error.message);
    }
  };

  const markAttendance = async (studentId, status) => {
    if (!isAdmin && studentId !== loggedInStudent?.id) return;

    try {
      const response = await fetch(`${API_BASE}/attendance/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error("Failed to update attendance");
      setAttendanceByStudent((prev) => ({ ...prev, [studentId]: status }));
    } catch (error) {
      setSyncError(error.message);
    }
  };

  const updateTeacherCount = async (nextCount) => {
    try {
      const response = await fetch(`${API_BASE}/settings/teachers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherCount: nextCount })
      });

      if (!response.ok) throw new Error("Failed to update teacher count");
      const data = await response.json();
      setTeacherCount(data.teacherCount || 0);
    } catch (error) {
      setSyncError(error.message);
    }
  };

  const renderDashboard = () => (
    <div className="page-grid">
      <section className="stat-grid">
        <article className="glass card lift">
          <p>{isAdmin ? "Students" : "My Class"}</p>
          <h3>{isAdmin ? students.length : `${loggedInStudent?.className}-${loggedInStudent?.section}`}</h3>
        </article>
        <article className="glass card lift">
          <p>{isAdmin ? "Teachers" : "My Roll No"}</p>
          <h3>{isAdmin ? teacherCount : loggedInStudent?.rollNo}</h3>
        </article>
        <article className="glass card lift">
          <p>{isAdmin ? "Attendance %" : "My Attendance"}</p>
          <h3>{isAdmin ? `${attendancePercent}%` : attendanceByStudent[loggedInStudent?.id] || "Present"}</h3>
        </article>
        <article className="glass card lift">
          <p>{isAdmin ? "Fees Collected" : "My Fee Status"}</p>
          <h3>{isAdmin ? paidCount * 3200 : loggedInStudent?.feeStatus}</h3>
        </article>
      </section>

      {isAdmin && (
        <section className="glass card">
          <div className="toolbar">
            <button className="btn-primary" onClick={() => updateTeacherCount(teacherCount + 1)}>
              Add Teacher Count
            </button>
            <button className="btn-ghost" onClick={() => updateTeacherCount(Math.max(0, teacherCount - 1))}>
              Decrease Teacher Count
            </button>
          </div>
        </section>
      )}

      <section className="chart-grid">
        <article className="glass card">
          <div className="card-title-row">
            <h4>Monthly Attendance</h4>
            <span className="badge good">Stable</span>
          </div>
          <div className="bars">
            {attendanceTrend.map((value, idx) => (
              <div key={`att-${idx}`} className="bar-wrap">
                <div style={{ height: `${value}%` }} className="bar" />
              </div>
            ))}
          </div>
        </article>

        <article className="glass card">
          <div className="card-title-row">
            <h4>Fee Analytics</h4>
            <span className="badge">Monthly</span>
          </div>
          <div className="line-chart">
            {feeTrend.map((value, idx) => (
              <div key={`fee-${idx}`} className="line-dot" style={{ bottom: `${value}%`, left: `${idx * 8.5}%` }} />
            ))}
          </div>
        </article>
      </section>

      <article className="glass card">
        <h4>Recent Activities</h4>
        <ul className="activity-list">
          {recentActivities.map((activity) => (
            <li key={activity}>{activity}</li>
          ))}
        </ul>
      </article>
    </div>
  );

  const renderStudents = () => (
    <div className="page-grid">
      <article className="glass card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by name or roll no"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Classes" : `Class ${c}`}
              </option>
            ))}
          </select>
          {isAdmin && (
            <button className="btn-primary" onClick={openAddStudent}>
              Add Student
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Class</th>
                <th>Roll</th>
                <th>Fee Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.className}-{student.section}</td>
                  <td>{student.rollNo}</td>
                  <td>
                    <span className={`badge ${student.feeStatus === "Paid" ? "good" : "warn"}`}>{student.feeStatus}</span>
                  </td>
                  <td className="row-actions">
                    <button className="btn-ghost" onClick={() => setViewStudent(student)}>
                      View
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn-ghost" onClick={() => openEditStudent(student)}>
                          Edit
                        </button>
                        <button className="btn-ghost danger-outline" onClick={() => deleteStudent(student.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  const renderAttendance = () => (
    <div className="page-grid">
      <article className="glass card">
        <div className="card-title-row">
          <h4>{isAdmin ? "Daily Attendance" : "My Attendance"}</h4>
          <div className="legend">
            <span className="chip present">Present</span>
            <span className="chip absent">Absent</span>
            <span className="chip leave">Leave</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(isAdmin ? students : students.filter((s) => s.id === loggedInStudent?.id)).map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.className}-{student.section}</td>
                  <td>
                    <div className="status-grid">
                      {["Present", "Absent", "Leave"].map((status) => (
                        <button
                          key={status}
                          className={`status-btn ${status.toLowerCase()} ${attendanceByStudent[student.id] === status ? "active" : ""}`}
                          onClick={() => markAttendance(student.id, status)}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  const renderFees = () => (
    <div className="page-grid">
      <section className="stat-grid">
        <article className="glass card lift">
          <p>{isAdmin ? "Paid" : "My Paid"}</p>
          <h3>{isAdmin ? paidCount : loggedInStudent?.feeStatus === "Paid" ? 1 : 0}</h3>
        </article>
        <article className="glass card lift">
          <p>{isAdmin ? "Pending" : "My Pending"}</p>
          <h3>{isAdmin ? pendingCount : loggedInStudent?.feeStatus === "Pending" ? 1 : 0}</h3>
        </article>
      </section>

      {isAdmin && (
        <article className="glass card">
          <h4>Add Fee</h4>
          <div className="toolbar">
            <select
              value={feeForm.studentId}
              onChange={(e) => setFeeForm((prev) => ({ ...prev, studentId: e.target.value }))}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={feeForm.amount}
              onChange={(e) => setFeeForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
            <select
              value={feeForm.status}
              onChange={(e) => setFeeForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
            <button className="btn-primary" onClick={addFeeRecord}>
              Add Fee Record
            </button>
          </div>
        </article>
      )}

      <article className="glass card">
        <h4>Payment History</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Receipt ID</th>
                <th>Student</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(isAdmin ? paymentHistory : currentStudentPayments).map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.receiptId}</td>
                  <td>{payment.student}</td>
                  <td>{payment.amount}</td>
                  <td>{payment.date}</td>
                  <td>
                    <span className={`badge ${payment.status === "Paid" ? "good" : "warn"}`}>{payment.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {isAdmin && (
        <article className="glass card">
          <h4>Pending Dues</h4>
          <div className="dues-grid">
            {students
              .filter((s) => s.feeStatus === "Pending")
              .map((student) => (
                <div key={student.id} className="due-item">
                  <strong>{student.name}</strong>
                  <span>Class {student.className}-{student.section}</span>
                  <span className="amount">3200 pending</span>
                </div>
              ))}
          </div>
        </article>
      )}
    </div>
  );

  const renderTimetable = () => (
    <div className="page-grid">
      <article className="glass card">
        <h4>Weekly Timetable</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <th key={`p-${idx}`}>Period {idx + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(timetable).map(([day, subjects]) => (
                <tr key={day}>
                  <td>{day}</td>
                  {subjects.map((subject) => (
                    <td key={`${day}-${subject}`}>
                      <span className={`subject-pill ${subjectPalette[subject] || "subject-gray"}`}>{subject}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );

  const renderNotifications = () => (
    <div className="page-grid">
      <article className="glass card">
        <h4>Announcement Feed</h4>
        <div className="notice-grid">
          {notices.map((notice) => (
            <article key={notice.id} className={`notice-card ${notice.urgent ? "urgent" : ""}`}>
              <div className="card-title-row">
                <h5>{notice.title}</h5>
                {notice.urgent && <span className="badge danger">Urgent</span>}
              </div>
              <p>{notice.body}</p>
            </article>
          ))}
        </div>
      </article>
    </div>
  );

  const renderPage = () => {
    if (activePage === "students") return renderStudents();
    if (activePage === "attendance") return renderAttendance();
    if (activePage === "fees") return renderFees();
    if (activePage === "timetable") return renderTimetable();
    if (activePage === "notifications") return renderNotifications();
    return renderDashboard();
  };

  if (!isAuthenticated) {
    return (
      <div className={`login-shell ${isDark ? "dark" : ""}`}>
        <div className="login-card glass">
          <section className="login-left">
            <h1>Mini School ERP</h1>
            <p>Role-based login for Student and Admin portal.</p>
            <div className="illustration">
              <div className="orb orb-one" />
              <div className="orb orb-two" />
              <div className="orb orb-three" />
            </div>
          </section>

          <section className="login-right">
            <div className="login-head">
              <h2>Welcome Back</h2>
              <button className="btn-ghost" onClick={() => setIsDark((prev) => !prev)}>
                {isDark ? "Light" : "Dark"}
              </button>
            </div>

            <label>Login As</label>
            <select value={authRole} onChange={(e) => setAuthRole(e.target.value)}>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
            </select>

            {authRole === "student" && (
              <>
                <label>Choose Student</label>
                <select value={selectedStudentLoginId} onChange={(e) => setSelectedStudentLoginId(e.target.value)}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label>Email</label>
            <input type="email" placeholder={authRole === "admin" ? "admin@school.edu" : "student@school.edu"} />
            <label>Password</label>
            <input type="password" placeholder="********" />
            <button
              className="btn-primary"
              onClick={() => {
                setIsAuthenticated(true);
                setActivePage("dashboard");
              }}
              disabled={syncLoading || (authRole === "student" && !selectedStudentLoginId)}
            >
              Sign In
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${isDark ? "dark" : ""}`}>
      <aside className={`sidebar glass ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">Mini School ERP</div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activePage === item.key ? "active" : ""}`}
              onClick={() => {
                setActivePage(item.key);
                setSidebarOpen(false);
              }}
            >
              <span className="icon-dot">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar glass">
          <button className="btn-ghost mobile-only" onClick={() => setSidebarOpen((prev) => !prev)}>
            Menu
          </button>
          <h2>{navItems.find((item) => item.key === activePage)?.label}</h2>
          <div className="top-actions">
            <button className="btn-ghost" onClick={() => setNotificationsOpen((prev) => !prev)}>
              Alerts
            </button>
            <button className="btn-ghost" onClick={() => setIsDark((prev) => !prev)}>
              {isDark ? "Light" : "Dark"}
            </button>
            <button className="btn-ghost" onClick={() => setIsAuthenticated(false)}>
              {isAdmin ? "Admin" : loggedInStudent?.name}
            </button>
          </div>
          {notificationsOpen && (
            <div className="alerts-popover glass">
              {notices.map((notice) => (
                <p key={notice.id} className={notice.urgent ? "urgent-text" : ""}>
                  {notice.title}
                </p>
              ))}
            </div>
          )}
        </header>

        {syncLoading ? <article className="glass card">Loading data from MongoDB...</article> : renderPage()}
        {syncError && <article className="glass card error-banner">{syncError}</article>}
      </main>

      {studentModalOpen && isAdmin && (
        <div className="modal-backdrop" onClick={() => setStudentModalOpen(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <h4>{editStudentId ? "Edit Student" : "Add Student"}</h4>
            <div className="form-grid">
              {[
                ["name", "Name"],
                ["className", "Class"],
                ["section", "Section"],
                ["rollNo", "Roll No"],
                ["guardian", "Guardian"],
                ["phone", "Phone"]
              ].map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    value={studentForm[field]}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                  {studentFormErrors[field] && <small className="error">{studentFormErrors[field]}</small>}
                </label>
              ))}
              <label>
                Fee Status
                <select
                  value={studentForm.feeStatus}
                  onChange={(e) => setStudentForm((prev) => ({ ...prev, feeStatus: e.target.value }))}
                >
                  <option>Paid</option>
                  <option>Pending</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setStudentModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveStudent}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {viewStudent && (
        <div className="modal-backdrop" onClick={() => setViewStudent(null)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <h4>Student Profile</h4>
            <div className="profile-grid">
              <p>Name: {viewStudent.name}</p>
              <p>Class: {viewStudent.className}-{viewStudent.section}</p>
              <p>Roll No: {viewStudent.rollNo}</p>
              <p>Guardian: {viewStudent.guardian}</p>
              <p>Phone: {viewStudent.phone}</p>
              <p>Fee Status: {viewStudent.feeStatus}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setViewStudent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
