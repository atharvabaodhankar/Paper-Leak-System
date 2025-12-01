import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import PaperUpload from '../../components/teacher/PaperUpload';

const TeacherDashboard = () => {
  const { contract, account } = useWeb3();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const fetchPapers = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const count = await contract.paperCount();
      const fetchedPapers = [];
      
      for (let i = 1; i <= count.toNumber(); i++) {
        const paper = await contract.getPaper(i);
        if (paper.teacher.toLowerCase() === account.toLowerCase()) {
          fetchedPapers.push({
            id: i,
            ...paper
          });
        }
      }
      setPapers(fetchedPapers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, [contract, account]);

  const getStatusBadge = (paper) => {
    if (paper.isUnlocked) return <span className="badge-success">Unlocked</span>;
    if (paper.isScheduled) return <span className="badge-primary">Scheduled</span>;
    return <span className="badge-secondary">Uploaded</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Your Question Papers</h2>
          <p className="text-[hsl(var(--color-text-secondary))]">Upload and manage your encrypted exam papers</p>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-2 text-sm">
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
              🔒 Complete Zero-Trust Security
            </div>
            <p className="text-green-300 text-xs">
              Once uploaded, even you (the Teacher) cannot decrypt your own papers. Only Exam Centers can access them at the scheduled time.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowUpload(!showUpload)} 
          className={showUpload ? 'btn-outline' : 'btn-primary'}
        >
          {showUpload ? 'View My Papers' : 'Upload New Paper'}
        </button>
      </div>

      {showUpload ? (
        <PaperUpload onUploadSuccess={() => {
          setShowUpload(false);
          fetchPapers();
        }} />
      ) : (
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-[hsl(var(--color-primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading your papers from blockchain...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-[hsl(var(--color-text-secondary))] mb-6">You haven't uploaded any papers yet.</p>
              <button onClick={() => setShowUpload(true)} className="btn-primary">Upload Your First Paper</button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[hsl(var(--color-bg-secondary))] text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Exam Name</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Upload Date</th>
                  <th className="px-6 py-4 font-semibold">Scheduled For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--color-border))]">
                {papers.map((paper) => (
                  <tr key={paper.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{paper.examName}</div>
                      <div className="text-xs text-[hsl(var(--color-text-muted))] font-mono">ID: {paper.id}</div>
                    </td>
                    <td className="px-6 py-4">{paper.subject}</td>
                    <td className="px-6 py-4">{getStatusBadge(paper)}</td>
                    <td className="px-6 py-4">
                      {new Date(paper.uploadTimestamp.toNumber() * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {paper.isScheduled 
                        ? new Date(paper.unlockTimestamp.toNumber() * 1000).toLocaleString() 
                        : 'Not Scheduled'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
