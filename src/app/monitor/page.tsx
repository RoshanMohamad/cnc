"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChevronDown, AlertCircle, Download, Search } from "lucide-react";
import { MqttMonitor } from "@/components/MqttMonitor";
import { ESP32Simulator } from "@/components/ESP32Simulator";
import { MachineStatusDisplay } from "@/components/MachineStatusDisplay";

// Mock Data
const cuttingJobs = [
  {
    id: "JOB-001",
    design: "Classic Crew",
    status: "Cutting",
    machine: "Cutter A",
    progress: 75,
    material: "Cotton",
    color: "White",
  },
  {
    id: "JOB-002",
    design: "V-Neck Vintage",
    status: "Queued",
    machine: "Cutter B",
    progress: 0,
    material: "Polyester",
    color: "Black",
  },
  {
    id: "JOB-003",
    design: "Graphic Tee",
    status: "Completed",
    machine: "Cutter A",
    progress: 100,
    material: "Cotton Blend",
    color: "Gray",
  },
  {
    id: "JOB-004",
    design: "Long Sleeve",
    status: "Cutting",
    machine: "Cutter C",
    progress: 40,
    material: "Cotton",
    color: "Navy",
  },
  {
    id: "JOB-005",
    design: "Henley Style",
    status: "Error",
    machine: "Cutter B",
    progress: 20,
    material: "Tri-Blend",
    color: "Red",
  },
  {
    id: "JOB-006",
    design: "Pocket Tee",
    status: "Completed",
    machine: "Cutter D",
    progress: 100,
    material: "Cotton",
    color: "Green",
  },
  {
    id: "JOB-007",
    design: "Ringer Tee",
    status: "Queued",
    machine: "Cutter A",
    progress: 0,
    material: "Polyester",
    color: "Blue",
  },
];

const machineStatusData = [
  { name: "Cutter A", status: "active" },
  { name: "Cutter B", status: "error" },
  { name: "Cutter C", status: "active" },
  { name: "Cutter D", status: "idle" },
];

const materialUsageData = [
  { name: "Cotton", value: 400 },
  { name: "Polyester", value: 300 },
  { name: "Cotton Blend", value: 200 },
  { name: "Tri-Blend", value: 100 },
];

const hourlyCutData = [
  { hour: "8am", cuts: 20 },
  { hour: "9am", cuts: 35 },
  { hour: "10am", cuts: 45 },
  { hour: "11am", cuts: 50 },
  { hour: "12pm", cuts: 42 },
  { hour: "1pm", cuts: 38 },
  { hour: "2pm", cuts: 55 },
  { hour: "3pm", cuts: 60 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

// Helper Components
type CardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

const Card = ({ title, children, className }: CardProps) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
  >
    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
      {title}
    </h3>
    {children}
  </div>
);

type JobStatus = "Cutting" | "Queued" | "Completed" | "Error";

const StatusBadge = ({ status }: { status: JobStatus }) => {
  const statusConfig: Record<JobStatus, string> = {
    Cutting: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    Queued: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    Completed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <span
      className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig[status]}`}
    >
      {status}
    </span>
  );
};

const ProgressBar = ({ value }: { value: number }) => (
  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
    <div
      className="bg-blue-600 h-2.5 rounded-full"
      style={{ width: `${value}%` }}
    ></div>
  </div>
);

export default function MonitorPage() {
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredJobs = cuttingJobs
    .filter((job) => filter === "All" || job.status === filter)
    .filter(
      (job) =>
        job.design.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalCuts = cuttingJobs.filter((j) => j.status === "Completed").length;
  const activeMachines = machineStatusData.filter(
    (m) => m.status === "active"
  ).length;
  const errorMachines = machineStatusData.filter(
    (m) => m.status === "error"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                T-Shirt Cutting Monitor
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Real-time overview of your cutting operations.
              </p>
            </div>
            <div className="flex items-center mt-4 sm:mt-0 space-x-2">
              <button className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card title="Total Cuts Today">
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {totalCuts}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                +5 since last hour
              </p>
            </Card>
            <Card title="Active Machines">
              <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                {activeMachines}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {machineStatusData.length} total machines
              </p>
            </Card>
            <Card title="Material Efficiency">
              <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                98.2%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                1.8% waste
              </p>
            </Card>
            <Card title="Alerts">
              <div className="flex items-center">
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                  {errorMachines}
                </p>
                <AlertCircle className="h-8 w-8 text-red-500 ml-3" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Machines with errors
              </p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            <Card title="Hourly Cut Performance" className="lg:col-span-3">
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={hourlyCutData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(128, 128, 128, 0.2)"
                    />
                    <XAxis dataKey="hour" tick={{ fill: "#9ca3af" }} />
                    <YAxis tick={{ fill: "#9ca3af" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="cuts" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Material Usage" className="lg:col-span-2">
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={materialUsageData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                    >
                      {materialUsageData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* MQTT Communication Panel */}
          <div className="mb-6">
            <MqttMonitor className="w-full" />
          </div>

          {/* ESP32 Control & Real-time Machine Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ESP32Simulator />
            <Card title="Real-time Machine Status">
              <MachineStatusDisplay />
            </Card>
          </div>

          {/* Cutting Jobs Table */}
          <Card title="Current Cutting Jobs">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Filter by status:</span>
                <div className="relative">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md pl-3 pr-8 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>All</option>
                    <option>Cutting</option>
                    <option>Queued</option>
                    <option>Completed</option>
                    <option>Error</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Job ID
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Design
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Material
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Color
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Machine
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {job.id}
                      </td>
                      <td className="px-6 py-4">{job.design}</td>
                      <td className="px-6 py-4">{job.material}</td>
                      <td className="px-6 py-4">{job.color}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={job.status as JobStatus} />
                      </td>
                      <td className="px-6 py-4">{job.machine}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={job.progress} />
                          <span className="text-xs font-medium">
                            {job.progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
