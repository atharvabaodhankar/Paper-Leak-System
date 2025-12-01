import { useState } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="container-custom py-20">
        <div className="text-center animate-fade-in">
          <h1 className="text-gradient mb-6">
            ChainSeal
          </h1>
          <p className="text-xl md:text-2xl text-[hsl(var(--color-text-secondary))] mb-8 max-w-3xl mx-auto">
            Decentralized Exam Paper Leak Prevention System
          </p>
          <p className="text-lg text-[hsl(var(--color-text-muted))] mb-12 max-w-2xl mx-auto">
            Preventing exam paper leaks through automated encryption, blockchain-based rules, 
            and zero human key ownership.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <button className="btn-primary">
              Get Started
            </button>
            <button className="btn-secondary">
              Learn More
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 animate-slide-up">
          <div className="glass-card-hover p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-3">Encrypted Storage</h3>
            <p className="text-[hsl(var(--color-text-secondary))]">
              Papers are encrypted and split into chunks, stored on IPFS with no single point of failure.
            </p>
            <span className="badge-primary mt-4">Secure</span>
          </div>

          <div className="glass-card-hover p-6">
            <div className="text-4xl mb-4">⛓️</div>
            <h3 className="text-xl font-bold mb-3">Blockchain Rules</h3>
            <p className="text-[hsl(var(--color-text-secondary))]">
              Time-locked smart contracts ensure papers unlock exactly 10 minutes before exam time.
            </p>
            <span className="badge-success mt-4">Immutable</span>
          </div>

          <div className="glass-card-hover p-6">
            <div className="text-4xl mb-4">🎲</div>
            <h3 className="text-xl font-bold mb-3">Random Selection</h3>
            <p className="text-[hsl(var(--color-text-secondary))]">
              Blockchain randomness selects one paper from the pool, preventing manipulation.
            </p>
            <span className="badge-warning mt-4">Fair</span>
          </div>
        </div>

        {/* Demo Section */}
        <div className="mt-20">
          <div className="glass-card p-8">
            <h2 className="text-3xl font-bold mb-6 text-center">System Status</h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[hsl(var(--color-bg-tertiary))] p-6 rounded-lg">
                <h4 className="text-lg font-semibold mb-4">Backend Status</h4>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--color-success))] animate-glow"></div>
                  <span className="text-[hsl(var(--color-text-secondary))]">MongoDB Connected</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--color-success))] animate-glow"></div>
                  <span className="text-[hsl(var(--color-text-secondary))]">Server Running on Port 5000</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--color-success))] animate-glow"></div>
                  <span className="text-[hsl(var(--color-text-secondary))]">IPFS Ready (Pinata)</span>
                </div>
              </div>

              <div className="bg-[hsl(var(--color-bg-tertiary))] p-6 rounded-lg">
                <h4 className="text-lg font-semibold mb-4">Design System</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button className="btn-primary text-sm py-2 px-4">Primary</button>
                  <button className="btn-secondary text-sm py-2 px-4">Secondary</button>
                  <button className="btn-outline text-sm py-2 px-4">Outline</button>
                </div>
                <input 
                  type="text" 
                  placeholder="Try the input field..." 
                  className="input mb-3"
                />
                <div className="flex gap-2">
                  <span className="badge-success">Success</span>
                  <span className="badge-warning">Warning</span>
                  <span className="badge-danger">Danger</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[hsl(var(--color-text-muted))] mb-4">
                ✅ Backend initialized • ✅ Database connected • ✅ Design system ready
              </p>
              <div className="inline-block px-6 py-3 bg-gradient-primary rounded-lg">
                <span className="text-white font-semibold">System Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

