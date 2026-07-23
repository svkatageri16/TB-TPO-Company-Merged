import React, { useState, useEffect } from 'react';
import { 
  Users, AlertTriangle, Monitor, Clock, CheckCircle2, ChevronLeft, Wifi, 
  Camera, X, Globe, MapPin, ShieldAlert, Laptop, FileText, Download, 
  Printer, BarChart3, HelpCircle, ArrowRight, Sparkles, Award, ShieldCheck, 
  Check, Info, TrendingUp, HelpCircle as HelpIcon, Play
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
const PIE_COLORS = ['#10b981', '#ef4444', '#94a3b8']; // Correct, Wrong, Skipped

export default function LiveMonitoring({ assessmentId, onBack }: { assessmentId: string, onBack: () => void }) {
  // Navigation & Live monitoring states
  const [activeTab, setActiveTab] = useState<'LIVE' | 'REPORTS'>('LIVE');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [testTitle, setTestTitle] = useState('Pre-Placement Mock Test');
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Class Report states
  const [reportData, setReportData] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Individual Report states
  const [selectedReportStudent, setSelectedReportStudent] = useState<any | null>(null);
  const [studentReportDetails, setStudentReportDetails] = useState<any | null>(null);
  const [loadingStudentReport, setLoadingStudentReport] = useState(false);

  // 1. Fetch live monitoring diagnostics (refresh every 10s)
  const fetchLiveStats = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const res = await api.get(`/assessments/monitor/${assessmentId}`);
      if (res.data.success) {
        setTestTitle(res.data.title || 'Assessment Test');
        const mapped = res.data.students.map((student: any) => {
          let status = 'ACTIVE';
          if (student.status === 'SUBMITTED' || student.status === 'COMPLETED') {
            status = 'COMPLETED';
          } else if (student.status === 'VIOLATED') {
            status = 'DISCONNECTED';
          } else if (student.warning_count > 0) {
            status = 'WARNING';
          }

          return {
            id: student.id,
            attempt_id: student.id,
            name: student.full_name || 'Unknown Student',
            email: student.email,
            batch: student.batch || 'Unassigned',
            status: status,
            progress: student.progress || 0,
            warnings: student.warning_count || 0,
            score: student.score,
            percentage: student.percentage,
            max_marks: student.max_marks,
            time_remaining: student.total_time_taken_seconds 
              ? `${Math.floor(student.total_time_taken_seconds / 60)}m` 
              : 'Active',
            connection: student.status === 'SUBMITTED' || student.status === 'COMPLETED' ? 'Completed' : 'Good',
            violations: student.violations || [],
            location: student.location || null
          };
        });
        setCandidates(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch live monitoring data", error);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStats(true);
    const interval = setInterval(() => {
      fetchLiveStats(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [assessmentId]);

  // 2. Fetch overall test report data
  const fetchTestReport = async () => {
    setLoadingReport(true);
    try {
      const res = await api.get(`/assessments/tpo/test-report/${assessmentId}`);
      if (res.data.success) {
        setReportData(res.data);
      } else {
        toast.error("Failed to load test metrics");
      }
    } catch (error) {
      console.error("Failed to fetch test report metrics:", error);
      toast.error("Network error fetching test report");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'REPORTS') {
      fetchTestReport();
    }
  }, [activeTab]);

  // 3. Fetch detailed individual scorecard with AI Analysis
  const fetchStudentReport = async (student: any) => {
    setSelectedReportStudent(student);
    setLoadingStudentReport(true);
    setStudentReportDetails(null);
    try {
      const attemptId = student.attempt_id;
      const res = await api.get(`/assessments/tpo/student-attempt-report/${attemptId}`);
      if (res.data.success) {
        setStudentReportDetails(res.data);
      } else {
        toast.error("Failed to load scorecard details");
      }
    } catch (error) {
      console.error("Failed to fetch student scorecard:", error);
      toast.error("Error retrieving individual metrics");
    } finally {
      setLoadingStudentReport(false);
    }
  };

  // 4. One-click pop-up printing for individual scorecards
  const handlePrintIndividual = (details: any) => {
    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print scorecards");
      return;
    }

    const { attempt, violations, answersReview, aiFeedback } = details;
    const isPassed = attempt.score >= attempt.passing_marks;

    // Correct vs wrong vs skipped numbers
    const correctCount = answersReview.filter((q: any) => q.is_correct).length;
    const skippedCount = answersReview.filter((q: any) => q.student_answer === 'Skipped').length;
    const wrongCount = answersReview.length - correctCount - skippedCount;

    const topicStats: any = {};
    answersReview.forEach((item: any) => {
      const top = item.topic || "General Concepts";
      if (!topicStats[top]) topicStats[top] = { correct: 0, total: 0 };
      topicStats[top].total++;
      if (item.is_correct) topicStats[top].correct++;
    });

    const topicRows = Object.entries(topicStats).map(([topic, stat]: any) => {
      const pct = ((stat.correct / stat.total) * 100).toFixed(0);
      return `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 13px;">${topic}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">${stat.correct} / ${stat.total}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #2563eb; font-weight: bold; font-size: 13px;">${pct}%</td>
      </tr>`;
    }).join('');

    const questionItems = answersReview.map((q: any, idx: number) => {
      const borderCol = q.is_correct ? '#10b981' : (q.student_answer === 'Skipped' ? '#94a3b8' : '#ef4444');
      const bgCol = q.is_correct ? '#f0fdf4' : (q.student_answer === 'Skipped' ? '#f8fafc' : '#fef2f2');
      const pillCol = q.is_correct ? 'background: #d1fae5; color: #065f46;' : (q.student_answer === 'Skipped' ? 'background: #cbd5e1; color: #1e293b;' : 'background: #fee2e2; color: #991b1b;');
      const statusText = q.is_correct ? 'CORRECT' : (q.student_answer === 'Skipped' ? 'SKIPPED' : 'INCORRECT');

      return `
        <div style="margin-bottom: 18px; padding: 20px; border-left: 6px solid ${borderCol}; background: ${bgCol}; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="font-weight: 800; font-size: 14px; max-width: 80%; color: #0f172a;">Q${idx + 1}: ${q.question_text}</div>
            <span style="font-size: 10px; font-weight: 900; padding: 4px 10px; border-radius: 20px; ${pillCol}">${statusText} (${q.marks} Marks)</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 10px; font-weight: bold; text-transform: uppercase; tracking-wider">Topic: ${q.topic}</div>
          <div style="margin-bottom: 6px; font-size: 13px;"><strong>Candidate Selected:</strong> <span style="color: ${q.is_correct ? '#10b981' : '#ef4444'}; font-weight: bold;">${q.student_answer}</span></div>
          <div style="margin-bottom: 12px; font-size: 13px;"><strong>Correct Solution Key:</strong> <span style="color: #10b981; font-weight: bold;">${q.correct_answer}</span></div>
          <div style="font-size: 12.5px; color: #475569; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.4;">
            <strong>Solution Insights:</strong> ${q.explanation}
          </div>
        </div>
      `;
    }).join('');

    const violationRows = violations.length > 0 ? violations.map((v: any) => `
      <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: #fee2e2; border-radius: 6px; font-size: 11px; font-weight: bold; color: #991b1b; margin-bottom: 6px;">
        <span>${v.violation_type?.replace(/_/g, ' ') || 'SUSPICIOUS_TAB_SWITCH'}</span>
        <span>Count: ${v.warning_count} warns (${new Date(v.captured_at).toLocaleTimeString()})</span>
      </div>
    `).join('') : '<p style="color: #10b981; font-size: 12px; font-weight: bold; margin: 0;">✔ Standard Proctor Integrity Verified. Zero Warnings Generated.</p>';

    printWindow.document.write(`
      <html>
        <head>
          <title>${attempt.full_name} - ${attempt.test_title} Scorecard</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;650;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background-color: #ffffff; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 24px; }
            .badge { display: inline-block; padding: 6px 16px; font-weight: 900; font-size: 12px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-pass { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
            .badge-fail { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
            table { width: 100%; border-collapse: collapse; }
            .kpi-row { display: flex; justify-content: space-between; font-size: 13.5px; border-bottom: 1px dashed #e2e8f0; padding: 8px 0; }
            .kpi-row:last-child { border-bottom: none; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; color: #0f172a;">Student Assessment Scorecard</h1>
              <div style="color: #64748b; font-weight: 700; margin-top: 6px; font-size: 14px;">Test: ${attempt.test_title} (${attempt.category})</div>
            </div>
            <div>
              <span class="badge ${isPassed ? 'badge-pass' : 'badge-fail'}">${isPassed ? 'PASS' : 'FAIL'}</span>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h3 style="margin-top: 0; text-transform: uppercase; font-size: 11px; tracking-wider: 1px; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; font-weight: 900;">Candidate Profile</h3>
              <div class="kpi-row"><span>Name:</span><strong>${attempt.full_name}</strong></div>
              <div class="kpi-row"><span>Email:</span><strong>${attempt.email}</strong></div>
              <div class="kpi-row"><span>Roll / Reg No:</span><strong>${attempt.roll_no || 'N/A'}</strong></div>
              <div class="kpi-row"><span>Academic Batch:</span><strong>${attempt.batch}</strong></div>
            </div>
            <div class="card">
              <h3 style="margin-top: 0; text-transform: uppercase; font-size: 11px; tracking-wider: 1px; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; font-weight: 900;">Performance Summary</h3>
              <div class="kpi-row"><span>Earned Marks:</span><strong>${attempt.score} / ${attempt.max_marks}</strong></div>
              <div class="kpi-row"><span>Percentage:</span><strong>${attempt.percentage}%</strong></div>
              <div class="kpi-row"><span>Time Elapsed:</span><strong>${Math.floor(attempt.total_time_taken_seconds / 60)}m ${attempt.total_time_taken_seconds % 60}s</strong></div>
              <div class="kpi-row"><span>Result Verdict:</span><strong style="color: ${isPassed ? '#10b981' : '#ef4444'}">${isPassed ? 'PASSED (>= ' + attempt.passing_marks + ')' : 'FAILED'}</strong></div>
            </div>
          </div>

          <div class="card" style="border-left: 6px solid #8b5cf6; background: #faf5ff;">
            <h3 style="margin-top: 0; color: #7c3aed; text-transform: uppercase; font-size: 12px; tracking-wider: 1.2px; font-weight: 900; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">🌟 AI Strategic Performance Insights</h3>
            <p style="font-size: 13.5px; margin-bottom: 8px;"><strong>Candidate Core Strengths:</strong> ${aiFeedback.strength}</p>
            <p style="font-size: 13.5px; margin-bottom: 12px;"><strong>Identified Growth Areas:</strong> ${aiFeedback.areaOfImprovement}</p>
            <p style="font-size: 13.5px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; font-size: 11px; color: #7c3aed;">Recommended Actions to Excel:</p>
            <ol style="font-size: 13px; padding-left: 20px; line-height: 1.6; margin: 0;">
              ${aiFeedback.actionPlan.map((p: string) => `<li style="margin-bottom: 4px;">${p}</li>`).join('')}
            </ol>
          </div>

          <div class="grid">
            <div class="card">
              <h3 style="margin-top: 0; text-transform: uppercase; font-size: 11px; tracking-wider: 1px; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; font-weight: 900; margin-bottom: 12px;">Answer Categorization</h3>
              <div class="kpi-row"><span>Correct Questions:</span><strong style="color: #10b981">${correctCount}</strong></div>
              <div class="kpi-row"><span>Wrong/Incorrect:</span><strong style="color: #ef4444">${wrongCount}</strong></div>
              <div class="kpi-row"><span>Skipped/Blank:</span><strong style="color: #64748b">${skippedCount}</strong></div>
              <div class="kpi-row"><span>Total Questions:</span><strong>${answersReview.length}</strong></div>
            </div>

            <div class="card">
              <h3 style="margin-top: 0; text-transform: uppercase; font-size: 11px; tracking-wider: 1px; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; font-weight: 900; margin-bottom: 12px;">Proctor Security Audit</h3>
              <div class="kpi-row"><span>Total Tab Switch Alerts:</span><strong>${violations.length} switches</strong></div>
              <div style="margin-top: 10px;">
                ${violationRows}
              </div>
            </div>
          </div>

          <div class="card">
            <h3 style="margin-top: 0; text-transform: uppercase; font-size: 11px; tracking-wider: 1px; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; font-weight: 900; margin-bottom: 12px;">Topic Accuracy</h3>
            <table>
              <thead>
                <tr style="border-bottom: 2px solid #cbd5e1; text-align: left;">
                  <th style="padding: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b;">Topic</th>
                  <th style="padding: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; text-align: center;">Correct / Total</th>
                  <th style="padding: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; text-align: right;">Accuracy Ratio</th>
                </tr>
              </thead>
              <tbody>
                ${topicRows}
              </tbody>
            </table>
          </div>

          <h3 style="margin-top: 40px; margin-bottom: 16px; text-transform: uppercase; font-size: 13px; tracking-wider: 1.5px; color: #475569; font-weight: 900;">Complete Question Log & Solution Keys</h3>
          <div>
            ${questionItems}
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 5. One-click pop-up printing for comprehensive test summaries
  const handlePrintAll = (report: any) => {
    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print reports");
      return;
    }

    const { test, stats, batchPerformance, scoreDistribution, students } = report;

    const studentRows = students.map((s: any, idx: number) => {
      const isPassed = s.score >= test.passing_marks;
      return `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: center; font-size: 12.5px;">${idx + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px;">
          <div style="font-weight: 700; color: #0f172a;">${s.full_name}</div>
          <div style="font-size: 10.5px; color: #64748b;">${s.email}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12.5px;">${s.batch}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; font-size: 12.5px;">${s.score} / ${test.max_marks}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12.5px;">${s.percentage}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; font-size: 11px;">
          <span style="padding: 4px 10px; border-radius: 4px; ${isPassed ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">${isPassed ? 'PASS' : 'FAIL'}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: ${s.warning_count > 0 ? '#ef4444' : '#64748b'}; font-size: 12.5px; font-weight: bold;">${s.warning_count}</td>
      </tr>`;
    }).join('');

    const batchRows = batchPerformance.map((b: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 13px;">${b.batch}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px;">${b.totalAppeared}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #2563eb; font-weight: bold; font-size: 13px;">${b.avgScore} Marks</td>
      </tr>
    `).join('');

    const distRows = scoreDistribution.map((d: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 13px;">${d.range}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569; font-size: 13px;">${d.count} candidates</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprehensive Test Report - ${test.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;650;850;900&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background-color: #ffffff; }
            .header { border-bottom: 3px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 14px; text-align: center; }
            .stat-val { font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px; }
            .stat-lbl { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 900; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f1f5f9; padding: 12px; font-size: 11px; font-weight: 950; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px;">Comprehensive Evaluation Report</h1>
            <div style="color: #64748b; font-weight: bold; margin-top: 6px; font-size: 14px;">Assessment Title: ${test.title} (${test.category})</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-weight: bold;">Compiled on: ${new Date().toLocaleString()} | Evaluator: AI Assessment Engine</div>
          </div>

          <div class="grid">
            <div class="stat-card" style="border-top: 4px solid #3b82f6;">
              <div class="stat-lbl">Pass Rate Ratio</div>
              <div class="stat-val" style="color: #2563eb;">${stats.passRate}%</div>
            </div>
            <div class="stat-card" style="border-top: 4px solid #10b981;">
              <div class="stat-lbl">Class Average</div>
              <div class="stat-val" style="color: #059669;">${stats.avgScore} / ${test.max_marks}</div>
            </div>
            <div class="stat-card" style="border-top: 4px solid #8b5cf6;">
              <div class="stat-lbl">Appeared / Assigned</div>
              <div class="stat-val" style="color: #7c3aed;">${stats.totalAppeared} / ${students.length}</div>
            </div>
            <div class="stat-card" style="border-top: 4px solid #ef4444;">
              <div class="stat-lbl">Proctor Warnings</div>
              <div class="stat-val" style="color: #dc2626;">${stats.totalWarnings} total</div>
            </div>
          </div>

          <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <div class="card">
              <h3 style="margin-top: 0; text-transform: uppercase; font-size: 11px; tracking-wider: 1px; color: #64748b; margin-bottom: 12px; font-weight: 900; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Batch Performance Summary</h3>
              <table>
                <thead>
                  <tr style="text-align: left;">
                    <th style="padding: 8px;">Batch Name</th>
                    <th style="padding: 8px; text-align: center;">Candidates</th>
                    <th style="padding: 8px; text-align: right;">Average Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${batchRows}
                </tbody>
              </table>
            </div>

            <div class="card">
              <h3 style="margin-top: 0; text-transform: uppercase; font-size: 11px; tracking-wider: 1px; color: #64748b; margin-bottom: 12px; font-weight: 900; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Score Distribution Segment</h3>
              <table>
                <thead>
                  <tr style="text-align: left;">
                    <th style="padding: 8px;">Percentage Range</th>
                    <th style="padding: 8px; text-align: right;">Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${distRows}
                </tbody>
              </table>
            </div>
          </div>

          <h3 style="margin-top: 40px; margin-bottom: 16px; text-transform: uppercase; font-size: 13px; tracking-wider: 1.5px; color: #475569; font-weight: 900;">Detailed Candidate Scoreboard</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Rank</th>
                <th style="text-align: left;">Candidate Info</th>
                <th style="text-align: center;">Batch</th>
                <th style="text-align: center;">Score</th>
                <th style="text-align: center;">Percentage</th>
                <th style="text-align: center;">Verdict</th>
                <th style="text-align: center;">Warnings</th>
              </tr>
            </thead>
            <tbody>
              ${studentRows}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadCSV = (report: any) => {
    const { test, students } = report;
    const headers = ["Rank", "Full Name", "Email", "Batch", "Roll No / ID", "Score", "Max Marks", "Percentage", "Status", "Warnings"];
    const rows = students.map((s: any, idx: number) => [
      idx + 1,
      s.full_name || "",
      s.email || "",
      s.batch || "",
      s.roll_no || "",
      s.score !== null ? s.score : "0",
      test.max_marks || "100",
      `${s.percentage || 0}%`,
      s.status || "PENDING",
      s.warning_count || 0
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Marks_Report_${test.title.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Marks Report downloaded successfully");
  };

  // Dynamic stats for live monitoring
  const activeCount = candidates.filter(c => c.status === 'ACTIVE' || c.status === 'WARNING').length;
  const warningCount = candidates.reduce((sum, c) => sum + (c.warnings > 0 ? 1 : 0), 0);
  const completedCount = candidates.filter(c => c.status === 'COMPLETED').length;
  const totalWarnings = candidates.reduce((sum, c) => sum + c.warnings, 0);

  return (
    <div className="space-y-6">
      {/* Top Navigation & Title Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white rounded-xl text-slate-400 hover:text-blue-600 shadow-sm border border-slate-200 transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {testTitle}
              </h2>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                candidates.length > 0 && candidates.some(c => c.status === 'ACTIVE') ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'
              }`}>
                {candidates.length > 0 && candidates.some(c => c.status === 'ACTIVE') ? '● LIVE NOW' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Assessment Ingress Diagnostic & Results Portal</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full xl:w-auto self-start">
          <button 
            onClick={() => setActiveTab('LIVE')}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
              activeTab === 'LIVE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor size={15} />
            Live Proctoring
          </button>
          <button 
            onClick={() => setActiveTab('REPORTS')}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
              activeTab === 'REPORTS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 size={15} />
            Metrics & Reports
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE PROCTORING MONITOR */}
      {activeTab === 'LIVE' && (
        <div className="space-y-6">
          {/* Diagnostic Stats Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={20} /></div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Assigned</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{candidates.length}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center"><Wifi size={20} /></div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Actively Online</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{activeCount}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center"><AlertTriangle size={20} /></div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Flagged Warnings</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{totalWarnings}</h3>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={20} /></div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Submissions</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">{completedCount}</h3>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
              Syncing Live Captures...
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
              <Users size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-base font-bold text-slate-900">No Student Ingress Captured</h3>
              <p className="text-slate-400 text-xs mt-1">Students will appear dynamically as they authenticate into the test room.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email / Batch</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnostics</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Exam Progress</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Warnings</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telemetry</th>
                      <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-extrabold text-sm text-slate-800">{c.name}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-xs font-bold text-slate-500">{c.email}</p>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mt-0.5">{c.batch}</p>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1 items-start">
                            {c.status === 'ACTIVE' && <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">Online</span>}
                            {c.status === 'WARNING' && <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase animate-pulse">Suspicious</span>}
                            {c.status === 'DISCONNECTED' && <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">Expelled</span>}
                            {c.status === 'COMPLETED' && <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">Finished</span>}
                            {c.score !== undefined && c.score !== null && (
                              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded mt-1">
                                Marks: {c.score}{c.max_marks ? `/${c.max_marks}` : ''}
                                {c.percentage !== undefined && c.percentage !== null ? ` (${Math.round(c.percentage)}%)` : (c.max_marks ? ` (${Math.round((c.score / c.max_marks) * 100)}%)` : '')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${c.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${c.progress}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-500">{c.progress}%</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Questions Answered</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`font-black text-sm ${c.warnings > 0 ? 'text-red-500 bg-red-50 px-2.5 py-1 rounded-lg' : 'text-slate-600'}`}>{c.warnings}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`flex items-center gap-1 text-xs font-bold ${c.connection === 'Good' || c.connection === 'Completed' ? 'text-emerald-600' : 'text-red-500'}`}>
                            <Wifi size={13} /> {c.connection}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => setSelectedStudent(c)}
                            className="text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl uppercase tracking-widest transition-all"
                          >
                            Diagnostics
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: COMPREHENSIVE PERFORMANCE & REPORTS */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-8">
          {loadingReport ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
              Compiling Test Statistics...
            </div>
          ) : !reportData ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
              <Users size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-base font-bold text-slate-900">Metrics Uncompiled</h3>
              <p className="text-slate-400 text-xs mt-1">We couldn't compile evaluations for this test ID.</p>
            </div>
          ) : (
            <div className="space-y-8 animate-fadeIn">
              {/* Report Hero Options */}
              <div className="bg-slate-900 rounded-3xl p-6 xl:p-8 text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12">
                  <FileText size={180} />
                </div>
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-yellow-400" />
                    <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest bg-yellow-400/10 px-2.5 py-0.5 rounded-full">Pro Evaluator Engine Ready</span>
                  </div>
                  <h3 className="text-lg xl:text-xl font-black uppercase tracking-tight">Generate Results Package</h3>
                  <p className="text-slate-400 text-xs font-semibold max-w-xl">
                    Export a master training audit sheet, class gradebook, or complete answer diagnostic spreadsheets formatted for immediate academic review.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 relative z-10">
                  <button 
                    onClick={() => handlePrintAll(reportData)}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20 transition-all"
                  >
                    <Printer size={14} />
                    Export Comprehensive PDF
                  </button>
                  <button 
                    onClick={() => handleDownloadCSV(reportData)}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <Download size={14} />
                    Download Marks CSV
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pass rate</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-2 leading-none">{reportData.stats.passRate}%</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">{reportData.stats.passedCount} candidates passed</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Score</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-2 leading-none">
                    {reportData.stats.avgScore} <span className="text-xs text-slate-400 font-bold">/ {reportData.test.max_marks}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Class Average Score</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">High / Low Marks</p>
                  <h3 className="text-xl font-black text-slate-900 mt-2 leading-none">
                    {reportData.stats.highestScore} <span className="text-xs text-slate-400 font-bold">/ {reportData.stats.lowestScore}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Class Extrema</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appeared</p>
                  <h3 className="text-2xl font-black text-blue-600 mt-2 leading-none">
                    {reportData.stats.totalAppeared} <span className="text-xs text-slate-400 font-bold">/ {reportData.students.length}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Completed Submissions</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Time Elapsed</p>
                  <h3 className="text-xl font-black text-slate-900 mt-2 leading-none">
                    {Math.floor(reportData.stats.avgTimeTakenSeconds / 60)}m {reportData.stats.avgTimeTakenSeconds % 60}s
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">Per-student submission avg</p>
                </div>
              </div>

              {/* Recharts Analytics Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Score Distribution Chart */}
                <div className="bg-white p-6 xl:p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <TrendingUp className="text-blue-500" size={16} /> Score Distribution Segments (%)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 11}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 11}} />
                        <ChartTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Batch Comparison Chart */}
                <div className="bg-white p-6 xl:p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Award className="text-purple-500" size={16} /> Batch-wise Performance Review
                  </h3>
                  <div className="h-64">
                    {reportData.batchPerformance.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase">No batch records to display</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.batchPerformance}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 11}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 11}} />
                          <ChartTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                          <Bar dataKey="avgScore" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete List of Submissions Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2"><Award className="text-green-500" /> Participant Gradebook & Evaluation Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student info</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Earned Score</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Percentage</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Result Verdict</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Warnings</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.students.map((student: any, idx: number) => {
                        const isPassed = student.score >= reportData.test.passing_marks;
                        return (
                          <tr key={student.attempt_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 font-black text-xs text-slate-400 text-center">{idx + 1}</td>
                            <td className="py-4 px-6">
                              <p className="font-extrabold text-slate-800 text-sm leading-none">{student.full_name}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-bold">{student.email}</p>
                            </td>
                            <td className="py-4 px-6 font-bold text-xs text-slate-600">{student.batch}</td>
                            <td className="py-4 px-6 font-extrabold text-sm text-slate-800">
                              {student.status === 'STARTED' ? (
                                <span className="text-slate-400 italic font-semibold">In Progress</span>
                              ) : (
                                `${student.score} / ${reportData.test.max_marks}`
                              )}
                            </td>
                            <td className="py-4 px-6 font-bold text-xs text-slate-600">
                              {student.status === 'STARTED' ? 'N/A' : `${student.percentage}%`}
                            </td>
                            <td className="py-4 px-6">
                              {student.status === 'STARTED' ? (
                                <span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Started</span>
                              ) : isPassed ? (
                                <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-emerald-100">PASS</span>
                              ) : (
                                <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-red-100">FAIL</span>
                              )}
                            </td>
                            <td className="py-4 px-6 font-bold text-xs text-slate-500">{student.warning_count || 0} alerts</td>
                            <td className="py-4 px-6 text-right">
                              {student.status !== 'STARTED' ? (
                                <button 
                                  onClick={() => fetchStudentReport(student)}
                                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl uppercase tracking-widest transition-all"
                                >
                                  View Scorecard
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-bold italic">Active Testing</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FEED DIAGNOSTICS LOG MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Camera size={20} className="text-blue-600" /> Proctored Live Feed Diagnostics
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase mt-1 tracking-wider">Candidate: {selectedStudent.name} ({selectedStudent.email})</p>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-900 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attempt Details</p>
                  <p className="text-sm font-bold text-slate-700">Status: <span className="text-blue-600 font-extrabold">{selectedStudent.status}</span></p>
                  <p className="text-sm font-bold text-slate-700 mt-1">Questions Answered: <span className="text-slate-950 font-extrabold">{selectedStudent.progress}%</span></p>
                  {selectedStudent.score !== undefined && selectedStudent.score !== null && (
                    <p className="text-sm font-bold text-slate-700 mt-1">Marks Obtained: <span className="text-emerald-600 font-extrabold">
                      {selectedStudent.score} Marks{selectedStudent.max_marks ? ` / ${selectedStudent.max_marks}` : ''}
                      {selectedStudent.percentage !== undefined && selectedStudent.percentage !== null ? ` (${Math.round(selectedStudent.percentage)}%)` : (selectedStudent.max_marks ? ` (${Math.round((selectedStudent.score / selectedStudent.max_marks) * 100)}%)` : '')}
                    </span></p>
                  )}
                  <p className="text-sm font-bold text-slate-700 mt-1">Batch: <span className="text-slate-950 font-extrabold">{selectedStudent.batch}</span></p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Security</p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    <Wifi size={14} className="text-green-500" /> Connection: <span className="text-green-600 font-extrabold">{selectedStudent.connection}</span>
                  </p>
                  <p className="text-sm font-bold text-slate-700 mt-1 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-orange-500" /> Proctor Warnings: <span className="font-extrabold text-red-600">{selectedStudent.warnings} flag(s)</span>
                  </p>
                </div>
              </div>

              {/* Location captured */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Laptop size={14} className="text-slate-500" /> Device & Location Diagnostics
                </h4>
                {selectedStudent.location ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs font-bold text-slate-600">
                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] tracking-wider">Browser & Device</span>
                      <span className="text-slate-900 font-bold">{selectedStudent.location.browser || 'N/A'} on {selectedStudent.location.device || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] tracking-wider">IP Address</span>
                      <span className="text-slate-900 font-mono font-bold">{selectedStudent.location.ip_address || 'N/A'}</span>
                    </div>
                    {selectedStudent.location.location_address && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block uppercase text-[10px] tracking-wider flex items-center gap-1"><MapPin size={10} /> Address</span>
                        <span className="text-slate-900 font-bold">{selectedStudent.location.location_address}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-400 italic">No diagnostic device fingerprints captured for this attempt.</p>
                )}
              </div>

              {/* Violations */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <ShieldAlert size={14} className="text-orange-500" /> Proctored Violation Logs
                </h4>
                {selectedStudent.violations && selectedStudent.violations.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.violations.map((v: any, index: number) => (
                      <div key={index} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">{v.violation_type?.replace(/_/g, ' ') || 'PROCTOR ALERT'}</span>
                        <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                          {v.warning_count} Warnings
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-wider">Zero Violations Detected</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">The candidate is adhering to browser & audio rules perfectly.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL SCORECARD DETAILED OVERLAY MODAL */}
      {selectedReportStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                  <Award size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    Candidate Evaluation Scorecard
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Detailed examination summary & AI Diagnostics for {selectedReportStudent.full_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {studentReportDetails && (
                  <button 
                    onClick={() => handlePrintIndividual(studentReportDetails)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-sm"
                  >
                    <Printer size={14} /> Print / Save PDF
                  </button>
                )}
                <button 
                  onClick={() => { setSelectedReportStudent(null); setStudentReportDetails(null); }} 
                  className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingStudentReport ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Running AI Scoring Engines & Formulations...</p>
                </div>
              ) : !studentReportDetails ? (
                <p className="text-center text-slate-400 font-bold py-10">Failed to compile detailed scorecard metrics.</p>
              ) : (
                <div className="space-y-6">
                  {/* Summary Rows side-by-side */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Core Profile Details */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">SP</div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">{studentReportDetails.attempt.full_name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{studentReportDetails.attempt.batch}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs font-bold text-slate-600">
                        <div className="flex justify-between"><span>Email Address:</span><span className="text-slate-900">{studentReportDetails.attempt.email}</span></div>
                        <div className="flex justify-between"><span>Roll / Reg No:</span><span className="text-slate-900">{studentReportDetails.attempt.roll_no || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Attempt ID:</span><span className="text-slate-900">#ATT-{studentReportDetails.attempt.attempt_id}</span></div>
                        <div className="flex justify-between"><span>Time Elapsed:</span><span className="text-slate-900">{Math.floor(studentReportDetails.attempt.total_time_taken_seconds / 60)}m {studentReportDetails.attempt.total_time_taken_seconds % 60}s</span></div>
                      </div>

                      {/* Proctoring Summary inside Profile */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                          <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <ShieldAlert size={12} className="text-orange-500" /> Proctoring Log
                          </span>
                          <span className={`font-black text-[10px] px-2 py-0.5 rounded-full ${studentReportDetails.violations.length > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {studentReportDetails.violations.length > 0 ? 'ALERT' : 'SECURE'}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-slate-500 font-bold">
                          {studentReportDetails.violations.length > 0 ? (
                            studentReportDetails.violations.map((v: any, index: number) => (
                              <div key={index} className="flex justify-between text-[10px] text-red-600 bg-red-50/50 p-1.5 rounded-md">
                                <span>{v.violation_type?.replace(/_/g, ' ')}</span>
                                <span>{v.warning_count} flags</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-emerald-600 italic">No security alerts triggered during examination.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Scores and Recharts Pie */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                      <div className="text-center space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marks Obtained</p>
                        <h3 className="text-4xl font-black text-slate-900">
                          {studentReportDetails.attempt.score} <span className="text-base text-slate-400 font-bold">/ {studentReportDetails.attempt.max_marks}</span>
                        </h3>
                        <div className="inline-block">
                          {studentReportDetails.attempt.score >= studentReportDetails.attempt.passing_marks ? (
                            <span className="bg-emerald-100 text-emerald-800 px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">PASSED</span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">FAILED</span>
                          )}
                        </div>
                        <p className="text-[10px] font-extrabold text-slate-500">Passing criteria: {studentReportDetails.attempt.passing_marks} Marks</p>
                      </div>

                      {/* Diagnostic breakdown with micro circular graph */}
                      <div className="flex items-center justify-around border-t border-slate-100 pt-4 mt-4">
                        <div className="text-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block mb-1" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Correct</p>
                          <p className="text-sm font-black text-slate-800">{studentReportDetails.answersReview.filter((a: any) => a.is_correct).length}</p>
                        </div>
                        <div className="text-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block mb-1" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wrong</p>
                          <p className="text-sm font-black text-slate-800">
                            {studentReportDetails.answersReview.filter((a: any) => !a.is_correct && a.student_answer !== 'Skipped').length}
                          </p>
                        </div>
                        <div className="text-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block mb-1" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Skipped</p>
                          <p className="text-sm font-black text-slate-800">{studentReportDetails.answersReview.filter((a: any) => a.student_answer === 'Skipped').length}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: AI Strategic Performance Insights */}
                    <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-purple-200/50 pb-2">
                          <Sparkles size={14} /> AI Strategic Diagnostics
                        </h4>
                        <div>
                          <span className="text-[10px] font-black text-purple-500 uppercase block tracking-wider">Candidate Strengths</span>
                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">{studentReportDetails.aiFeedback.strength}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-purple-500 uppercase block tracking-wider">Opportunities for Growth</span>
                          <p className="text-xs font-semibold text-slate-700 mt-1 leading-relaxed">{studentReportDetails.aiFeedback.areaOfImprovement}</p>
                        </div>
                      </div>

                      <div className="bg-white/80 p-3 rounded-2xl border border-purple-100/50 mt-4 text-[10.5px] font-semibold text-purple-800 space-y-1">
                        <span className="font-extrabold uppercase text-[9px] text-purple-600 block tracking-wider">AI Milestone Milestones:</span>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {studentReportDetails.aiFeedback.actionPlan.map((action: string, idx: number) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Question-by-Question Solution Diagnostic Log */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-500" /> Answer Log & Verification Sheets
                    </h3>
                    
                    <div className="space-y-4">
                      {studentReportDetails.answersReview.map((q: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={`p-5 rounded-2xl border ${
                            q.is_correct 
                              ? 'bg-emerald-50/20 border-emerald-100' 
                              : (q.student_answer === 'Skipped' ? 'bg-slate-50 border-slate-100' : 'bg-red-50/20 border-red-100')
                          }`}
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                            <span className="font-extrabold text-sm text-slate-900">
                              Question {idx + 1}: {q.question_text}
                            </span>
                            <div className="flex gap-2">
                              <span className="bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">
                                {q.topic}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                q.is_correct 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : (q.student_answer === 'Skipped' ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-800')
                              }`}>
                                {q.is_correct ? 'CORRECT' : (q.student_answer === 'Skipped' ? 'SKIPPED' : 'WRONG')}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold mb-3">
                            <div className="p-3 bg-white rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 block uppercase mb-1">Student Option Selected</span>
                              <span className={q.is_correct ? 'text-emerald-600' : 'text-red-500'}>{q.student_answer}</span>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 block uppercase mb-1">Correct Solution Key</span>
                              <span className="text-emerald-600">{q.correct_answer}</span>
                            </div>
                          </div>

                          <div className="bg-white/80 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed font-semibold">
                            <strong className="text-slate-800 block text-[10px] uppercase tracking-widest mb-1.5">Verification Explanation</strong>
                            {q.explanation || 'No explanation captured.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => { setSelectedReportStudent(null); setStudentReportDetails(null); }} 
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
