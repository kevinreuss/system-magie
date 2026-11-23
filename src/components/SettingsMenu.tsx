import { useEffect, useRef, useState } from 'react';
import { getSelectedRoomId, rooms, type RoomId } from '../rooms';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const currentRoom = getSelectedRoomId();
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  function changeRoom(id: RoomId) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', id);
    window.location.assign(url.href);
  }
  return <div id="settings-wrap" ref={wrap}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
    }}>
    <button type="button" id="settings-toggle" ref={toggle}
      aria-label="Einstellungen" title="Einstellungen"
      aria-expanded={open} aria-controls="settings-panel"
      onClick={() => { setOpen(!open); setRoomsOpen(false); }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 3 .6-1h4.8l.6 3 2 1.2 2.8-.9 2.4 4.2-2.2 2v2.3l2.2 2-2.4 4.2-2.8-.9-2 1.2-.6 2.7H9l-.6-2.7-2-1.2-2.8.9-2.4-4.2 2.2-2v-2.3l-2.2-2 2.4-4.2 2.8.9 2-1.2L9 3Z" transform="translate(1 1) scale(.9)" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    </button>
    <div id="settings-panel" hidden={!open}>
      <div className="add-heading">Einstellungen</div>
      <button type="button" className="room-menu-toggle" aria-expanded={roomsOpen}
        aria-controls="room-options" onClick={() => setRoomsOpen(!roomsOpen)}>
        <span>Raum ändern<small>{rooms[currentRoom].name}</small></span>
        <span aria-hidden="true">{roomsOpen ? '−' : '+'}</span>
      </button>
      <div id="room-options" role="group" aria-label="Raum auswählen" hidden={!roomsOpen}>
        {(Object.keys(rooms) as RoomId[]).map((id) => <button type="button" key={id}
          aria-pressed={id === currentRoom} disabled={id === currentRoom}
          onClick={() => changeRoom(id)}>
          <span>{rooms[id].name}</span><span aria-hidden="true">{id === currentRoom ? '✓' : ''}</span>
        </button>)}
        <p>Beim Raumwechsel startet die Aufstellung neu.</p>
      </div>
    </div>
  </div>;
}
