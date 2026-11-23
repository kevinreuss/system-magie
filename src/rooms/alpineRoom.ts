import { createTexturedRoom } from './winterRoom';
import { ALPINE_ROOM_TEXTURES } from '../assets/textures/alpine';
import { buildFireplace } from './fireplace';

const room = createTexturedRoom('alpine', 'Almhütte', ALPINE_ROOM_TEXTURES, 2.6, false);
export const alpineRoom = {
  ...room,
  async build(...args: Parameters<typeof room.build>) {
    await room.build(...args);
    if (!args[1].aborted) await buildFireplace(...args);
  },
};
