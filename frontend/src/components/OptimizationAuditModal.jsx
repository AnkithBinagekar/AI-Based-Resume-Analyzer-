import React from 'react';
import { 
  X, AlertTriangle, CheckCircle2, XCircle, FileText, 
  Download, ShieldCheck, ArrowRight, TrendingDown, 
  TrendingUp, Minus, Info, FileSearch
} from 'lucide-react';

const OptimizationAuditModal = ({ 
  isOpen, 
  onClose, 
  validationData, 
  onDownloadOriginal, 
  onDownloadAI 
}) => {
  if (!isOpen || !validationData) return null;

  const {
    verdict, // e.g., 'Needs Review', 'Accepted', 'Rejected'
    ui_state, // e.g., 'warning', 'success', 'danger'
    is_safe_to_auto_replace,
    original_score = 77.1,
    ai_score = 60.5,
    improvement_delta = -16.6,
    audit_log = []
  } = validationData;

  // 1. Better Terminology Mapping
  const getEnterpriseTerminology = (state) => {
    switch(state) {
      case 'success': return { title: 'Cleared for Deployment', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', icon: ShieldCheck };
      case 'warning': return { title: 'Manual Review Advised', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', icon: AlertTriangle };
      case 'danger': return { title: 'Regression Detected', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: XCircle };
      default: return { title: 'Pending Review', color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20', icon: Info };
    }
  };

  const uiTheme = getEnterpriseTerminology(ui_state);
  const StatusIcon = uiTheme.icon;

  // 2. Score Delta Formatting
  const isPositive = improvement_delta > 0;
  const isNeutral = improvement_delta === 0;
  const deltaColor = isPositive ? 'text-green-400' : isNeutral ? 'text-gray-400' : 'text-red-400';
  const DeltaIcon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      {/* Modal Container */}
      <div className="bg-[#1A1F2E]/95 backdrop-blur-3xl w-full max-w-5xl rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#1A1F2E]/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <FileSearch className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-100 tracking-wide">AI Optimization Audit Report</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content - 2 Column Split */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Audit Details & Checklist */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Verdict Card */}
            <div className={`rounded-xl border ${uiTheme.border} ${uiTheme.bg} p-5 flex items-start gap-4`}>
              <div className={`p-2 rounded-lg bg-[#0A0D14]/50 ${uiTheme.color}`}>
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider ${uiTheme.color} mb-1`}>
                  Status: {uiTheme.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {is_safe_to_auto_replace 
                    ? "The AI revision successfully preserved the original context while improving systemic formatting. It is safe to proceed."
                    : "The AI revision caused a decrease in ATS compatibility metrics. To protect candidate matching, keeping the original source document is highly recommended."}
                </p>
              </div>
            </div>

            {/* Score Comparison Widget */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Compatibility Analysis</h4>
              <div className="flex items-center justify-between bg-gray-800/40 p-5 rounded-xl border border-gray-700/50">
                <div className="text-center flex-1">
                  <div className="text-sm text-gray-400 mb-1">Source Document</div>
                  <div className="text-3xl font-bold text-gray-200">{original_score.toFixed(1)}%</div>
                </div>
                
                <div className="flex-shrink-0 px-4">
                  <ArrowRight className="w-6 h-6 text-gray-600" />
                </div>
                
                <div className="text-center flex-1">
                  <div className="text-sm text-gray-400 mb-1">AI-Optimized Revision</div>
                  <div className={`text-3xl font-bold ${isPositive ? 'text-green-400' : 'text-gray-200'}`}>
                    {ai_score.toFixed(1)}%
                  </div>
                </div>

                <div className="flex-shrink-0 w-px h-12 bg-gray-700 mx-4 hidden sm:block"></div>

                <div className="text-right flex-1 hidden sm:block">
                  <div className="text-sm text-gray-400 mb-1">Net Impact</div>
                  <div className={`flex items-center justify-end gap-1.5 text-xl font-bold ${deltaColor}`}>
                    <DeltaIcon className="w-5 h-5" />
                    {improvement_delta > 0 ? '+' : ''}{improvement_delta.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Audit Checklist */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Validation Checklist</h4>
              <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-2">
                <ul className="space-y-1">
                  {audit_log.map((log, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                      {log.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />}
                      {log.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />}
                      {log.type === 'error' && <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
                      <span className="text-sm text-gray-300">{log.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Download Actions */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Document Actions</h4>
            
            {/* Recommended Action Card */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg">
                Recommended
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-100">
                    {is_safe_to_auto_replace ? "AI-Optimized Revision" : "Source Document"}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">Safest choice based on ATS metrics</p>
                </div>
              </div>
              <button 
                onClick={is_safe_to_auto_replace ? onDownloadAI : onDownloadOriginal}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
              >
                <Download className="w-4 h-4" />
                Download Recommended
              </button>
            </div>

            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-xs text-gray-600 font-medium uppercase tracking-wider">Alternative</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>

            {/* Alternative Action Card */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 flex flex-col opacity-90 hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-3 mb-4">
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-300">
                    {!is_safe_to_auto_replace ? "AI-Optimized Revision" : "Source Document"}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">Available for manual review</p>
                </div>
              </div>
              <button 
                onClick={!is_safe_to_auto_replace ? onDownloadAI : onDownloadOriginal}
                className="w-full py-2.5 px-4 bg-transparent border border-gray-600 hover:border-gray-400 hover:text-white text-gray-300 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Alternative
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationAuditModal;