# Study Buddy 🎓

> Your Smart Study Companion — Track. Focus. Improve.

Study Buddy is a full-stack smart study monitoring platform designed to help students overcome distractions, improve concentration, and build consistent study habits.

Unlike traditional study timers that only measure study duration, Study Buddy focuses on the **quality of a study session** by combining real-time focus monitoring, distraction detection, a dynamic Focus Score, digital distraction control, gamification, and AI-based study assistance.

---

## 🚀 Problem Statement

Students often spend hours studying but lose productive time because of:

- 📱 Phone distractions
- 🌐 Unrelated browser tabs
- 👀 Loss of attention
- 👥 Interruptions from people around them
- 📉 Lack of motivation and consistency

A normal timer can tell a student **how long** they studied, but it cannot indicate **how focused** they were.

Study Buddy aims to solve this problem by creating a more accountable and interactive study environment.

---

## ✨ Key Features

### 🎯 Real-Time Focus Monitoring

The core feature of Study Buddy is its **real-time computer-vision-based focus monitoring system using OpenCV and YOLOv8**.

During an active study session, the system analyzes the camera feed and detects potential distractions such as:

- 📱 Phone usage
- 👤 Changes in face orientation
- 👥 Multiple faces
- 🌐 Tab switching

These signals are combined to calculate a real-time Focus Score**.

---

### 📊 Real-Time Focus Dashboard

The Focus Score starts from **100** and dynamically changes when relevant distractions are detected.

The dashboard:

- Displays the current Focus Score
- Shows monitoring status in real time
- Updates every **5 seconds**
- Provides immediate feedback about the student's focus
- Saves the **complete monitoring report** of the study session
- Allows the student to review focus and distraction data after the session

### Focus Monitoring Flow

```text
Detect Distraction
        ↓
Identify Distraction
        ↓
Calculate Focus Score
        ↓
Update Dashboard
        ↓
Save Monitoring Data
        ↓
Give Real-Time Feedback
