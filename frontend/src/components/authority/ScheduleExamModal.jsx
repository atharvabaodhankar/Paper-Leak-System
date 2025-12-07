import { useState } from 'react';

const ScheduleExamModal = ({ paper, onClose, onSchedule }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !time || !roomNumber) return;

    try {
      setLoading(true);
      // Construct timestamp
      const scheduledDateTime = new Date(`${date}T${time}`);
      const unlockTimestamp = Math.floor(scheduledDateTime.getTime() / 1000);
      
      const now = Math.floor(Date.now() / 1000);
      if (unlockTimestamp <= now) {
        alert('Unlock time must be in the future');
        return;
      }

      await onSchedule(paper.id, unlockTimestamp, roomNumber);
    } catch (error) {
      console.error('Scheduling error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
        <h3 className="text-2xl font-bold mb-2">Schedule Exam</h3>
        <p className="text-[hsl(var(--color-text-secondary))] mb-6 text-sm">
          Set the unlock time and room for: <br/>
          <span className="text-[hsl(var(--color-primary))] font-semibold">{paper.examName} ({paper.subject})</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Exam Date</label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={loading}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unlock Time</label>
            <input
              type="time"
              className="input-field"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              disabled={loading}
            />
            <p className="text-[10px] text-yellow-500 mt-1">⚠️ This is when the paper becomes accessible to the center</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Room Number / Hall</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Hall A, Booth 12"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleExamModal;
