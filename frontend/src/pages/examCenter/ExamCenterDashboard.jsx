import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';

const ExamCenterDashboard = () => {
  const { contract, account } = useWeb3();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Exam Center Dashboard</h2>
        <p className="text-[hsl(var(--color-text-secondary))]">Access and reassemble your assigned question papers</p>
      </div>

      <div className="glass-card p-6 text-center py-12">
        <div className="text-6xl mb-4">🖨️</div>
        <h3 className="text-xl font-bold mb-2">Center Status: Active</h3>
        <p className="text-[hsl(var(--color-text-secondary))]">Download and Decryption functionality is coming in Phase 2D.</p>
        <div className="mt-6 p-4 bg-yellow-500/10 text-yellow-500 rounded-lg inline-block">
          Please ensure your Private Key is ready for decryption at exam time.
        </div>
      </div>
    </div>
  );
};

export default ExamCenterDashboard;
