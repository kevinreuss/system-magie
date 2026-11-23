import { winterRoom } from './winterRoom';
import { plainRoom } from './plainRoom';
import { alpineRoom } from './alpineRoom';

export const rooms = {
  winter: winterRoom,
  plain: plainRoom,
  alpine: alpineRoom,
};
export type RoomId = keyof typeof rooms;
export const defaultRoom = rooms.winter;
export function getSelectedRoomId(): RoomId {
  const id = new URLSearchParams(window.location.search).get('room');
  return id && Object.hasOwn(rooms, id) ? id as RoomId : 'winter';
}
