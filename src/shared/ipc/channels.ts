export const IPC = {
  SONGS_LIST: 'songs:list',
  SONGS_GET: 'songs:get',
  SONGS_RELOAD: 'songs:reload',

  TEMPLATES_LIST: 'templates:list',
  TEMPLATES_GET: 'templates:get',

  PRESENT_LOAD_SONG: 'present:loadSong',
  PRESENT_GOTO_SLIDE: 'present:gotoSlide',
  PRESENT_NEXT_SLIDE: 'present:nextSlide',
  PRESENT_PREV_SLIDE: 'present:prevSlide',
  PRESENT_SET_MODE: 'present:setMode',
  PRESENT_SET_TEMPLATE: 'present:setTemplate',
  PRESENT_CLEAR: 'present:clear',

  SHELL_OPEN_FILE: 'shell:openFile',

  DISPLAY_LIST: 'display:list',
  APP_GET_PATHS: 'app:getPaths',

  PRESENT_STATE_CHANGED: 'present:stateChanged',
  LIBRARY_CHANGED: 'library:changed',
  OUTPUT_RENDER: 'output:render',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
