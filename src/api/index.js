export const getHomepage = (onData, onError) => {
  const socket = new WebSocket('wss://spacegap-backend.herokuapp.com');
  socket.onopen = (event) => { }

  socket.onmessage = (event) => {
    onData(JSON.parse(event.data))
  }
}
