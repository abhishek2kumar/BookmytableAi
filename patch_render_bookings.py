import re

with open('src/components/PartnerDashboardView.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r"  const renderBookingsTab = \(\) => \{.*?    return \(\s*<div className=\"space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500\">.*?      </div>\s*\);\s*\};", re.DOTALL)

replacement = """  const renderBookingsTab = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings: any[] = [];
    const upcomingBookings: any[] = [];
    const previousBookings: any[] = [];

    const getBookingDate = (b: any) => {
      if (b.date) return new Date(b.date);
      if (b.dateTime?.seconds) return new Date(b.dateTime.seconds * 1000);
      if (b.dateTime) return new Date(b.dateTime);
      return new Date(0);
    };

    const sortedBookings = [...bookings].sort((a, b) => {
      const dateA = getBookingDate(a);
      const dateB = getBookingDate(b);
      return dateB.getTime() - dateA.getTime();
    });

    sortedBookings.forEach(booking => {
      const bd = getBookingDate(booking);
      if (!isNaN(bd.getTime()) && bd.getTime() > 0) {
        const bdStr = bd.toISOString().split('T')[0];
        if (bdStr === todayStr) {
          todayBookings.push(booking);
        } else if (bd > new Date(todayStr)) {
          upcomingBookings.push(booking);
        } else {
          previousBookings.push(booking);
        }
      }
    });

    const updateBookingStatus = async (bookingId: string, newStatus: string) => {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
      } catch (err) {
        console.error("Failed to update status", err);
      }
    };

    let displayBookings = todayBookings;
    if (bookingFilter === 'upcoming') displayBookings = upcomingBookings;
    if (bookingFilter === 'previous') displayBookings = previousBookings;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden gap-6 md:gap-4">
           <div>
             <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Table Reservations</h2>
             <p className="text-slate-500 text-xs font-semibold mt-1">Manage all your table bookings.</p>
           </div>
           <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-center gap-2 mr-0 md:mr-4 border-r-0 md:border-r border-slate-200 pr-0 md:pr-4">
               <span className="text-sm font-bold text-slate-700">Accepting Bookings</span>
               <button 
                 onClick={() => toggleFeature('isBookingEnabled', !selectedRes?.isBookingEnabled)}
                 className={cn("w-12 h-6 rounded-full transition-colors relative", selectedRes?.isBookingEnabled ? "bg-green-500" : "bg-slate-300")}
               >
                 <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm", selectedRes?.isBookingEnabled ? "left-[26px]" : "left-[2px]")} />
               </button>
             </div>
             <button onClick={() => setShowNewBookingModal(true)} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto md:ml-0">
                <Plus size={18} />
                New Booking
             </button>
           </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
           <button onClick={() => setBookingFilter('today')} className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap", bookingFilter === 'today' ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Today's Bookings ({todayBookings.length})</button>
           <button onClick={() => setBookingFilter('upcoming')} className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap", bookingFilter === 'upcoming' ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Upcoming ({upcomingBookings.length})</button>
           <button onClick={() => setBookingFilter('previous')} className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap", bookingFilter === 'previous' ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Previous ({previousBookings.length})</button>
        </div>

        <div>
          {displayBookings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
               <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
               <p className="text-sm font-bold text-slate-600">No {bookingFilter} bookings found.</p>
            </div>
          ) : (
            displayBookings.map(b => <BookingCard key={b.id} b={b} updateBookingStatus={updateBookingStatus} />)
          )}
        </div>
      </div>
    );
  };"""

content = pattern.sub(replacement, content)

with open('src/components/PartnerDashboardView.tsx', 'w') as f:
    f.write(content)
