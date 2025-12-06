import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';

const AuthorityDashboard = () => {
  const { contract } = useWeb3();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAllPapers = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const count = await contract.paperCount();
      const fetchedPapers = [];
      for (let i = 1; i <= count.toNumber(); i++) {
        const paper = await contract.getPaper(i);
        fetchedPapers.push({ id: i, ...paper });
      }
      setPapers(fetchedPapers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPapers();
  }, [contract]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Exam Authority Dashboard</h2>
        <p className="text-[hsl(var(--color-text-secondary))]">Schedule exams and manage paper unlocking</p>
      </div>

      <div className="glass-card p-6 text-center py-12">
        <div className="text-6xl mb-4">🏛️</div>
        <h3 className="text-xl font-bold mb-2">Authority Level: Admin</h3>
        <p className="text-[hsl(var(--color-text-secondary))]">Scheduling functionality is coming in Phase 2C.</p>
      </div>
    </div>
  );
};

export default AuthorityDashboard;
