export const getHomepage = (onData, onError) => {
  const socket = new WebSocket('ws://localhost:8080');
  socket.onopen = (event) => { }

  socket.onmessage = (event) => {
    onData(JSON.parse(event.data))
  }
}
