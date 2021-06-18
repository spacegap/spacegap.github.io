export const getHomepage = (onData, onError) => {
  const socket = new WebSocket('wss://api.spacegap.d.interplanetary.one');
  socket.onopen = (event) => { }

  socket.onmessage = (event) => {
    onData(JSON.parse(event.data))
  }
}
