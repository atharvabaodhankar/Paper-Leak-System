import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Clock, Plus, Trash2, X } from 'lucide-react';

const ScheduleExamModal = ({ paper, onClose, onSchedule }) => {
  const { contract } = useWeb3();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState([]);
  const [selectedCenters, setSelectedCenters] = useState([{ centerAddress: '', classroom: '' }]);

  useEffect(() => {
    const fetchCenters = async () => {
      if (!contract) return;
      try {
        const [addresses, names] = await contract.getAllCenters();
        const centerList = addresses.map((addr, idx) => ({
          address: addr,
          name: names[idx]
        }));
        setCenters(centerList);
      } catch (error) {
        console.error('Error fetching centers:', error);
      }
    };
    fetchCenters();
  }, [contract]);

  const addCenterRow = () => {
    setSelectedCenters([...selectedCenters, { centerAddress: '', classroom: '' }]);
  };

  const removeCenterRow = (index) => {
    if (selectedCenters.length > 1) {
      setSelectedCenters(selectedCenters.filter((_, i) => i !== index));
    }
  };

  const updateCenterRow = (index, field, value) => {
    const updated = [...selectedCenters];
    updated[index][field] = value;
    setSelectedCenters(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validCenters = selectedCenters.filter(c => c.centerAddress && c.classroom);
    if (validCenters.length === 0) {
        alert('Please select at least one center and provide a classroom');
        return;
    }
    if (!date || !time) return;

    try {
      setLoading(true);
      const scheduledDateTime = new Date(`${date}T${time}`);
      const unlockTimestamp = Math.floor(scheduledDateTime.getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      if (unlockTimestamp <= now) {
         alert('Unlock time must be in the future');
         setLoading(false);
         return;
      }
      const centerAddresses = validCenters.map(c => c.centerAddress);
      const classrooms = validCenters.map(c => c.classroom);
      await onSchedule(paper.id, unlockTimestamp, centerAddresses, classrooms);
    } catch (error) {
      console.error('Scheduling error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-2xl border-slate-700 bg-slate-900 shadow-2xl">
         <CardHeader>
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <CardTitle>Schedule Exam</CardTitle>
                    <CardDescription>Assign secure time-lock and authorized centers.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
            </div>
         </CardHeader>
         <CardContent>
             <div className="mb-6 bg-slate-950 p-4 rounded-lg flex items-center justify-between border border-slate-800">
                <div>
                    <p className="text-xs text-slate-500 uppercase">Exam Paper</p>
                    <p className="font-semibold text-white">{paper.examName}</p>
                </div>
                <Badge>ID: {paper.id}</Badge>
             </div>

             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-slate-400">Date</label>
                            <button 
                                type="button" 
                                onClick={() => {
                                    const now = new Date();
                                    const year = now.getFullYear();
                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                    const day = String(now.getDate()).padStart(2, '0');
                                    setDate(`${year}-${month}-${day}`);
                                }}
                                className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                            >
                                Set Today
                            </button>
                        </div>
                        <div className="relative group">
                            <Calendar 
                                className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-hover:text-primary transition-colors cursor-pointer z-10" 
                                onClick={(e) => {
                                    const input = e.target.nextElementSibling;
                                    if(input && input.showPicker) input.showPicker();
                                }}
                            />
                            <Input 
                                type="date" 
                                className="pl-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                required 
                                min={new Date().toISOString().split('T')[0]} 
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-slate-400">Unlock Time</label>
                            <button 
                                type="button" 
                                onClick={() => {
                                    const now = new Date();
                                    now.setMinutes(now.getMinutes() + 15); // Add 15 mins buffer
                                    const hours = String(now.getHours()).padStart(2, '0');
                                    const minutes = String(now.getMinutes()).padStart(2, '0');
                                    setTime(`${hours}:${minutes}`);
                                }}
                                className="text-[10px] text-primary hover:text-primary/80 transition-colors"
                            >
                                Set Now
                            </button>
                        </div>
                        <div className="relative group">
                             <Clock 
                                className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-hover:text-primary transition-colors cursor-pointer z-10" 
                                onClick={(e) => {
                                    const input = e.target.nextElementSibling;
                                    if(input && input.showPicker) input.showPicker();
                                }}
                             />
                             <Input 
                                type="time" 
                                className="pl-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                value={time} 
                                onChange={(e) => setTime(e.target.value)} 
                                required 
                             />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-400">Distribution List</label>
                        <Button type="button" variant="outline" size="sm" onClick={addCenterRow} className="text-xs h-7">
                            <Plus className="w-3 h-3 mr-1" /> Add Center
                        </Button>
                    </div>
                    
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                        {selectedCenters.map((center, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <select 
                                    className="flex-1 h-10 w-full rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-primary"
                                    value={center.centerAddress}
                                    onChange={(e) => updateCenterRow(index, 'centerAddress', e.target.value)}
                                    required
                                >
                                    <option value="">Select Center...</option>
                                    {centers.map(c => (
                                        <option key={c.address} value={c.address}>{c.name}</option>
                                    ))}
                                </select>
                                <Input 
                                    placeholder="Room / Hall No." 
                                    className="flex-1"
                                    value={center.classroom}
                                    onChange={(e) => updateCenterRow(index, 'classroom', e.target.value)}
                                    required
                                />
                                {selectedCenters.length > 1 && (
                                    <Button type="button" variant="outline" size="icon" onClick={() => removeCenterRow(index)} className="border-red-900/50 text-red-500 hover:bg-red-950">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? 'Submitting...' : 'Confirm Schedule'}
                    </Button>
                </div>
             </form>
         </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleExamModal;
