import React from 'react';

const SeatLayout = ({
  seats = [],
  selectedSeat = null,
  myBookedSeatId = null,
  highlightedSeatId = null,
  onSeatClick,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 cg-card min-h-[400px]">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#f9ca3a', borderTopColor: 'transparent' }} />
        <p className="text-sm font-semibold mt-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading seating layout...</p>
      </div>
    );
  }

  if (!seats || seats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 cg-card min-h-[400px]">
        <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>No seats available in this classroom.</p>
      </div>
    );
  }

  // Group seats by seatIndex (row index)
  const seatsByColIndex = {};
  seats.forEach((seat) => {
    if (!seatsByColIndex[seat.seatIndex]) seatsByColIndex[seat.seatIndex] = [];
    seatsByColIndex[seat.seatIndex].push(seat);
  });

  const sortedNewRowKeys = Object.keys(seatsByColIndex).map(Number).sort((a, b) => a - b);
  const reversedRowLetters = [...new Set(seats.map((s) => s.row))].sort().reverse();

  // Determine CSS class for each seat
  const getSeatClass = (seat) => {
    const isMySeat = myBookedSeatId && seat._id === myBookedSeatId;
    const isSelected = selectedSeat && seat._id === selectedSeat._id;
    const isHighlighted = highlightedSeatId && seat._id === highlightedSeatId;

    let cls = 'seat-btn ';
    if (isMySeat)       cls += 'seat-mine';
    else if (isSelected) cls += 'seat-selected';
    else if (seat.isBooked) cls += 'seat-booked';
    else cls += 'seat-available';

    if (isHighlighted) cls += ' seat-highlighted';
    return cls;
  };

  const legend = [
    { label: 'Available', className: 'seat-btn seat-available', style: { width: 20, height: 20, borderRadius: 6, fontSize: 0 } },
    { label: 'Booked',    className: 'seat-btn seat-booked',    style: { width: 20, height: 20, borderRadius: 6, fontSize: 0 } },
    { label: 'Selected',  className: 'seat-btn seat-selected',  style: { width: 20, height: 20, borderRadius: 6, fontSize: 0, transform: 'none' } },
    { label: 'My Seat',   className: 'seat-btn seat-mine',      style: { width: 20, height: 20, borderRadius: 6, fontSize: 0, transform: 'none' } },
  ];

  return (
    <div className="cg-card p-6 md:p-8 flex flex-col items-center">
      {/* CLASS BOARD */}
      <div className="w-full max-w-lg mb-10 flex flex-col items-center">
        <div
          className="w-full py-3 text-center font-extrabold text-sm tracking-[0.2em] uppercase rounded-b-2xl"
          style={{
            background: 'linear-gradient(90deg, #5d21d1 0%, #7c3aed 50%, #5d21d1 100%)',
            color: '#f9ca3a',
            boxShadow: '0 6px 30px rgba(93,33,209,0.55)',
            border: '1px solid rgba(249,202,58,0.25)',
            borderTop: 'none',
          }}
        >
          ✦ CLASS BOARD ✦
        </div>
        <div
          className="w-2/5 py-2 text-xs text-center font-bold tracking-wider uppercase rounded-b-xl mt-0.5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderTop: 'none',
          }}
        >
          Teacher's Desk
        </div>
      </div>

      {/* SEATING GRID */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-6 flex justify-center">
        <div className="flex flex-col gap-2.5 min-w-max px-2">
          {sortedNewRowKeys.map((colIndex) => (
            <div key={colIndex} className="flex items-center gap-2.5">
              {/* Left number */}
              <span className="w-7 text-center text-xs font-extrabold select-none"
                style={{ color: '#f9ca3a', fontFamily: 'Inter, sans-serif' }}>
                {colIndex}
              </span>

              {/* Seats */}
              <div className="flex items-center gap-2">
                {reversedRowLetters.map((rowLetter) => {
                  const seat = seatsByColIndex[colIndex].find((s) => s.row === rowLetter);
                  if (seat) {
                    return (
                      <button
                        key={seat._id}
                        id={`seat-${seat.seatNumber}`}
                        onClick={() => onSeatClick(seat)}
                        className={getSeatClass(seat)}
                        title={`${seat.seatNumber} — ${
                          seat._id === myBookedSeatId ? 'My Seat' :
                          seat.isBooked ? `Booked by ${seat.bookedBy?.name || 'Student'}` : 'Available'
                        }`}
                      >
                        {seat.seatNumber}
                      </button>
                    );
                  } else {
                    return (
                      <div
                        key={`spacer-${rowLetter}-${colIndex}`}
                        className="seat-btn"
                        style={{ background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'default', pointerEvents: 'none' }}
                      />
                    );
                  }
                })}
              </div>

              {/* Right number */}
              <span className="w-7 text-center text-xs font-extrabold select-none"
                style={{ color: '#f9ca3a', fontFamily: 'Inter, sans-serif' }}>
                {colIndex}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* LEGEND */}
      <div className="mt-8 pt-6 w-full max-w-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="section-label text-center mb-4">Seat Status Legend</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={item.className} style={item.style} />
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeatLayout;
