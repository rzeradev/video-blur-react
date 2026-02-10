import { VideoRecorder } from './components/VideoRecorder'
import './App.css'

function App() {
  return (
    <div className="app">
      <header>
        <h1>Video Filters & Noise Suppression POC</h1>
        <p>React + TypeScript + MediaPipe</p>
      </header>
      <main>
        <VideoRecorder />
      </main>
    </div>
  )
}

export default App
