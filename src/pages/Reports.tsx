import { FileText, Download, Calendar, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { useState } from 'react';

const reportTypes = [
  { id: 'performance', label: 'Performance Report', icon: TrendingUp },
  { id: 'trades', label: 'Trading Activity', icon: BarChart3 },
  { id: 'portfolio', label: 'Portfolio Analysis', icon: PieChart },
];

const reports = [
  {
    id: 1,
    title: 'Monthly Performance Report - January 2024',
    type: 'Performance Report',
    date: '2024-01-31',
    size: '2.4 MB',
    status: 'Generated',
  },
  {
    id: 2,
    title: 'Trading Activity Summary - Q4 2023',
    type: 'Trading Activity',
    date: '2023-12-31',
    size: '1.8 MB',
    status: 'Generated',
  },
  {
    id: 3,
    title: 'Portfolio Analysis - December 2023',
    type: 'Portfolio Analysis',
    date: '2023-12-15',
    size: '3.2 MB',
    status: 'Generated',
  },
  {
    id: 4,
    title: 'Weekly Performance Report - Week 52',
    type: 'Performance Report',
    date: '2023-12-29',
    size: '1.1 MB',
    status: 'Generated',
  },
];

const analytics = [
  { label: 'Total Reports Generated', value: '47', change: '+12 this month', isUp: true },
  { label: 'Avg Report Size', value: '2.1 MB', change: '-0.3 MB', isUp: false },
  { label: 'Reports This Month', value: '12', change: '+3', isUp: true },
  { label: 'Last Generated', value: '2 days ago', change: null, isUp: null },
];

export function Reports() {
  const [selectedType, setSelectedType] = useState('all');

  const filteredReports = selectedType === 'all'
    ? reports
    : reports.filter(report => report.type === reportTypes.find(t => t.id === selectedType)?.label);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.map((stat, index) => (
          <div key={index} className="bg-slate-900 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{stat.label}</span>
              {stat.isUp !== null && (
                stat.isUp ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                )
              )}
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            {stat.change && (
              <div className={`text-xs font-medium ${stat.isUp === null ? 'text-slate-400' : stat.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Report Type Filters */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedType === 'all'
                ? 'bg-emerald-400/20 text-emerald-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Reports
          </button>
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  selectedType === type.id
                    ? 'bg-emerald-400/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold">Generated Reports</h2>
          </div>
          <button className="px-4 py-2 bg-emerald-400 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generate New Report
          </button>
        </div>

        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-slate-800 rounded-lg p-4 border border-slate-700/50 hover:bg-slate-750 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="px-2 py-1 bg-slate-700 text-xs text-slate-300 rounded">
                      {report.type}
                    </span>
                    <span className="px-2 py-1 bg-emerald-400/20 text-emerald-400 text-xs rounded">
                      {report.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{report.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {report.date}
                    </div>
                    <div>{report.size}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


