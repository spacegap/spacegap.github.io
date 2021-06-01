export const getHomepage = (onData, onError) => {
  const socket = new WebSocket('ws://spacegap-backend.herokuapp.com');
  socket.onopen = (event) => { }

  socket.onmessage = (event) => {
    onData(JSON.parse(event.data))
  }
}
