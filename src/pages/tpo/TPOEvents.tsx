import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  Users,
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  X,
  Upload,
  Image as ImageIcon,
  ArrowUpRight,
  CheckCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPOEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'HACKATHON',
    start_date: '',
    end_date: '',
    location_or_link: '',
    college_id: '',
    image_url: ''
  });
  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [registrants, setRegistrants] = useState<any[]>([]);
  const [loadingRegistrants, setLoadingRegistrants] = useState(false);
  const [registrantSearch, setRegistrantSearch] = useState('');

  useEffect(() => {
    fetchEvents();
    fetchColleges();
  }, []);

  const fetchRegistrants = async (eventId: number) => {
    setLoadingRegistrants(true);
    try {
      const res = await api.get(`/tpo/events/${eventId}/registrations`);
      if (res.data.success) {
        setRegistrants(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
      toast.error("Failed to fetch registered candidates");
    } finally {
      setLoadingRegistrants(false);
    }
  };

  const handleUpdateRegistrationStatus = async (eventId: number, regId: number, status: string) => {
    try {
      const res = await api.put(`/tpo/events/${eventId}/registrations/${regId}`, { status });
      if (res.data.success) {
        toast.success(`Candidate marked as ${status}`);
        fetchRegistrants(eventId);
        fetchEvents(); // update counts
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update candidate status");
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await api.get('/tpo/colleges');
      if (res.data.success) setColleges(res.data.data);
    } catch (error) {
      console.error('Error fetching colleges');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/tpo/events', newEvent);
      if (res.data.success) {
        toast.success('Event created successfully');
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          description: '',
          event_type: 'HACKATHON',
          start_date: '',
          end_date: '',
          location_or_link: '',
          college_id: '',
          image_url: ''
        });
        fetchEvents();
      }
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/tpo/events');
      if (res.data.success) {
        setEvents(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      UPCOMING: 'bg-blue-100 text-blue-700',
      ONGOING: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-slate-100 text-slate-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };
    return <span className={`${styles[status] || 'bg-slate-100'} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider`}>{status}</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Create Event
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by drive title or company..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'PLACEMENT_DRIVE', 'WORKSHOP'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${filterType === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest italic">Create New Event</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Schedule a recruitment drive, competition, or hackathon</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Event Title */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                  placeholder="e.g. Smart College Hackathon 2026"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>

              {/* Event Type & College */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Type</label>
                  <select 
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none cursor-pointer"
                    value={newEvent.event_type}
                    onChange={e => setNewEvent({...newEvent, event_type: e.target.value})}
                  >
                    <option value="HACKATHON">Hackathon 🏆</option>
                    <option value="COMPETITION">Competition 🎖️</option>
                    <option value="PLACEMENT_DRIVE">Placement Drive 💼</option>
                    <option value="WORKSHOP">Workshop 🛠️</option>
                    <option value="WEBINAR">Webinar 🌐</option>
                    <option value="INTERVIEW">Interview 📋</option>
                    <option value="SEMINAR">Seminar 🎤</option>
                    <option value="TRAINING">Training 📘</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select College</label>
                  <select 
                    required
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none cursor-pointer"
                    value={newEvent.college_id}
                    onChange={e => setNewEvent({...newEvent, college_id: e.target.value})}
                  >
                    <option value="">Select college...</option>
                    {colleges.map(c => (
                      <option key={c.id} value={c.id}>{c.college_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={newEvent.start_date}
                    onChange={e => setNewEvent({...newEvent, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date (Optional)</label>
                  <input 
                    type="date" 
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={newEvent.end_date}
                    onChange={e => setNewEvent({...newEvent, end_date: e.target.value})}
                  />
                </div>
              </div>

              {/* Venue or Link */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Venue or Registration Link</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                  placeholder="e.g. Campus Seminar Hall or https://hackathon.org"
                  value={newEvent.location_or_link}
                  onChange={e => setNewEvent({...newEvent, location_or_link: e.target.value})}
                />
              </div>

              {/* Banner Image Dropzone / Picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Banner / Cover Image</label>
                <div className="flex flex-col gap-3">
                  {newEvent.image_url ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={newEvent.image_url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, image_url: '' })}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 transition-all bg-slate-50 flex flex-col items-center justify-center gap-1.5 relative group cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewEvent({ ...newEvent, image_url: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Upload size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Upload Event Banner (Drag or Click)</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Supports PNG, JPG, WEBP formats</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Or Image URL</span>
                    <input
                      type="text"
                      className="flex-1 px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/banner.jpg"
                      value={newEvent.image_url}
                      onChange={(e) => setNewEvent({ ...newEvent, image_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm min-h-[100px]"
                  placeholder="Details about the drive, registration requirements, timeline, etc."
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Create Event Now
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
            <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Events Found</h3>
            <p className="text-slate-500 mt-2">Start by creating your first placement drive or workshop.</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-48 h-32 bg-slate-100 rounded-2xl shrink-0 overflow-hidden relative flex flex-col items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                  ) : null}
                  <div className={`absolute bottom-2 left-2 ${event.image_url ? 'bg-slate-950/90 text-white border border-slate-800' : 'bg-slate-100 text-slate-800 border border-slate-200'} backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md flex flex-col items-center justify-center min-w-[50px]`}>
                     <p className="text-sm font-black leading-none">{new Date(event.start_date).getDate()}</p>
                     <p className="text-[9px] font-black uppercase tracking-tighter mt-0.5">
                       {new Date(event.start_date).toLocaleString('default', { month: 'short' })}
                     </p>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(event.status)}
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.event_type}</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{event.title}</h3>
                      <p className="text-sm text-slate-500 mt-2 font-medium line-clamp-2">{event.description}</p>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                      <MoreVertical size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={16} />
                      <span className="text-xs font-bold">{event.location_or_link || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock size={16} />
                      <span className="text-xs font-bold">{new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users size={16} />
                      <span className="text-xs font-bold">{event.registration_count || 0} Registered</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEvent(event);
                        fetchRegistrants(event.id);
                      }}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-black text-xs cursor-pointer group/btn transition-all duration-200"
                    >
                      <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🔮 Detailed Event View & Registrations Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 overflow-hidden relative my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Close button */}
            <button 
              type="button" 
              onClick={() => { setSelectedEvent(null); setRegistrantSearch(''); }}
              className="absolute top-4 right-4 z-10 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all border border-slate-200/50 shadow-sm cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
              
              {/* Left Side: Campaign Branding & Key Metrics */}
              <div className="md:col-span-5 bg-slate-50 border-r border-slate-100 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {getStatusBadge(selectedEvent.status)}
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedEvent.event_type}</span>
                  </div>

                  {selectedEvent.image_url ? (
                    <div className="relative w-full h-48 bg-slate-200 rounded-2xl overflow-hidden border border-slate-100 mb-6 group shadow-sm flex items-center justify-center">
                      <img 
                        src={selectedEvent.image_url} 
                        alt={selectedEvent.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-indigo-100/30 flex flex-col items-center justify-center text-center p-4 mb-6 shadow-inner relative overflow-hidden">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                        <Calendar className="text-blue-600 w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">
                        Placement Drive & Hackathon
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-black text-slate-900 leading-snug uppercase tracking-tight mb-2">
                    {selectedEvent.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
                    🏢 {selectedEvent.college_name || "Partner College"}
                  </p>

                  <div className="space-y-4 border-t border-slate-200/60 pt-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar className="text-indigo-600 shrink-0" size={18} />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Timeline Dates</p>
                        <p className="text-xs font-bold text-slate-700">
                          {new Date(selectedEvent.start_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                          {selectedEvent.end_date ? ` to ${new Date(selectedEvent.end_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-slate-600">
                      <MapPin className="text-emerald-600 shrink-0" size={18} />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Venue Location / Link</p>
                        <p className="text-xs font-bold text-slate-700 break-all">
                          {selectedEvent.location_or_link ? (
                            <a 
                              href={selectedEvent.location_or_link.startsWith("http") ? selectedEvent.location_or_link : `https://${selectedEvent.location_or_link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {selectedEvent.location_or_link} <ExternalLink size={12} />
                            </a>
                          ) : (
                            'Physical Classroom'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200/60 mt-6 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/20">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Total Count Of Live Registrations</p>
                  <p className="text-2xl font-black text-slate-800 flex items-baseline gap-1 mt-1">
                    {selectedEvent.registration_count || 0}
                    <span className="text-xs font-extrabold text-slate-400 uppercase ml-1">Registered</span>
                  </p>
                </div>
              </div>

              {/* Right Side: Description & Candidates Listing */}
              <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-6">
                
                {/* Scrollable container for Right details */}
                <div className="space-y-6 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                  
                  {/* Event description block */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">About / Event Description</h4>
                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {selectedEvent.description || "No full description provided."}
                    </p>
                  </div>

                  {/* Registered Candidates Listing */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Candidate Applicants</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage and update status of student applicants</p>
                      </div>
                      
                      {/* Search profile input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input 
                          type="text" 
                          placeholder="Search applicant name..."
                          className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-1 focus:ring-indigo-500 font-bold text-[11px] w-full sm:w-48"
                          value={registrantSearch}
                          onChange={(e) => setRegistrantSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    {loadingRegistrants ? (
                      <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-6 h-6 border-2 border-slate-305 border-t-indigo-600 rounded-full animate-spin" />
                        Fetching applicants...
                      </div>
                    ) : (() => {
                      const filtered = registrants.filter(r => 
                        r.full_name?.toLowerCase().includes(registrantSearch.toLowerCase()) ||
                        r.aadhar_or_college_id?.toLowerCase().includes(registrantSearch.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 rounded-2xl border border-slate-100">
                            {registrantSearch ? "No matching candidates" : "No candidates registered yet"}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {filtered.map((reg: any) => (
                            <div 
                              key={reg.registration_id} 
                              className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-200 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                                  {reg.profile_photo_url ? (
                                    <img src={reg.profile_photo_url} alt={reg.full_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs font-black text-slate-500">{reg.full_name?.substring(0, 2).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <h5 className="text-xs font-extrabold text-slate-800 truncate">{reg.full_name}</h5>
                                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] font-bold text-slate-400">
                                    <span>ID: {reg.aadhar_or_college_id || 'N/A'}</span>
                                    <span>•</span>
                                    <span>{reg.contact || 'No Contact Phone'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                {/* Resume link */}
                                {reg.resume_url ? (
                                  <a 
                                    href={reg.resume_url.startsWith('http') ? reg.resume_url : `https://${reg.resume_url}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-black uppercase text-indigo-600 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
                                  >
                                    CV <ChevronRight size={10} />
                                  </a>
                                ) : null}

                                {/* Status update dropdown selector */}
                                <select 
                                  value={reg.status}
                                  onChange={(e) => handleUpdateRegistrationStatus(selectedEvent.id, reg.registration_id, e.target.value)}
                                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                                    reg.status === 'SELECTED' ? 'bg-emerald-50 text-emerald-700' :
                                    reg.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                                    reg.status === 'ATTENDED' ? 'bg-blue-50 text-blue-700' :
                                    'bg-amber-50 text-amber-700'
                                  }`}
                                >
                                  <option value="REGISTERED">Registered</option>
                                  <option value="ATTENDED">Attended</option>
                                  <option value="SELECTED">Selected</option>
                                  <option value="REJECTED">Rejected</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* Footer close button */}
                <div className="border-t border-slate-100 pt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setSelectedEvent(null); setRegistrantSearch(''); }}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Close View
                  </button>
                </div>

              </div>
              
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
