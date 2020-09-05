import React, { useState, useEffect } from 'react'
import { fetch as filecoinFetch, fetchHead } from './services/filecoin'
import Blockies from 'blockies-identicon'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.scss'

function getJSONFromHistory (name) {
    const prev = window.localStorage.getItem(name)
    return prev && JSON.parse(prev)
}

function App () {
    const [miner, setMiner] = useState(getJSONFromHistory('miner'))
    const [hash, setHash] = useState(window.localStorage.getItem('hash'))
    const [hashInput, setHashInput] = useState(window.localStorage.getItem('hash') || '')
    const [head, setHead] = useState(getJSONFromHistory('head'))

    // Bootstrap: Fetch head
    useEffect(() => {
        const fetchingHead = async () => {
            const fetched = await fetchHead()
            window.localStorage.setItem('head', JSON.stringify(fetched))
            setHead(fetched)
        }
        fetchingHead()
        setInterval(() => fetchingHead(), 30000)
    }, [])

    // On new (hash or head): fetch miner
    useEffect(() => {
        let mounted = true

        const fetchMiner = async () => {
            if (hash && head) {
                const miner = await filecoinFetch(hash, head)
                if (mounted) {
                    console.log('spacegap','logged correct miner', hash, miner.id)
                    setMiner(miner)
                    window.localStorage.setItem('miner', JSON.stringify(miner))
                } else {
                    console.log('spacegap', 'logged incorrect miner', hash, miner.id)
                }
            }
        }
        fetchMiner(head, hash)
        return () => { mounted = false }
    }, [head, hash])

    useEffect(() => {
        console.log('spacegap', 'miner has changed', miner)
    }, [miner])

    useEffect(() => {
        console.log('spacegap', 'hash has changed', hash)
    }, [hash])

    const handleLookup = (e) => {
        e.preventDefault()
        setHash(hashInput)
        window.localStorage.setItem('hash', hashInput)
        setMiner()
    }


    return (
        <div className='App'>
            <header className='container-fluid'>
                <h1>spacegap</h1>
            </header>
            <section id='LookUp' className='container'>
                <form onSubmit={handleLookup}>
                    <input
                        type='text'
                        value={hashInput}
                        onChange={e => setHashInput(e.target.value)}
                    />
                    <input type="submit" value="Look"/>
                </form>
            </section>
            <section className='container'>
                <Miner miner={miner} head={head} />
            </section>
        </div>
    )
}

const PoSt = ({ epoch, posted, skipped }) => {
    return (
        <div>
            Epoch {epoch}: {posted ? 'posted' : 'missed'}
        </div>
    )
}

const Circle = ({ state }) => {
    return <div className={`circle ${state}`}>{state}</div>
}

const Miner = ({ miner, head }) => {
    const canvasRef = React.useRef(null)
    const [context, setContext] = React.useState(null)

    useEffect(() => {
        if (canvasRef.current) {
            Blockies.render({seed: miner.id}, canvasRef.current)

            const renderCtx = canvasRef.current.getContext('2d');

            if (renderCtx) {
                setContext(renderCtx);
            }
        }
    }, [context, miner]);

    if (!miner) {
        return <></>
    }

    return (
        <div>
            <span><canvas ref={canvasRef}></canvas></span>
            <h1>{miner.id}</h1>

            <div>
                <div className='row'>
                    <div class="col">
                        <h3>💵 Balance</h3>
                    </div>
                    <div class="col">
                        Miner is not in debt
                    </div>
                </div>
                <div className='row'>
                    {
                        miner.collateral &&
                        <div class="col-sm">
                            <h2>{miner.collateral || 0} FIL</h2>
                            Collateral
                        </div>
                    }
                    {
                        miner.available &&
                        <div class="col-sm">
                            <h2>{miner.available || 0} FIL</h2>
                            Available
                        </div>
                    }
                    {
                        miner.locked &&
                        <div class="col-sm">
                            <h2>{miner.locked || 0} FIL</h2>
                            Locked
                        </div>
                    }
                </div>
            </div>

            <div>
                <div className='row'>
                    <div className='col'>
                        <h3>📦 Sectors</h3>
                    </div>
                </div>
                <div className='row'>
                    {
                        miner.sectorsCount &&
                        <div className='col'>
                            <h2>{miner.sectorsCount}</h2>
                            Sectors
                        </div>
                    }
                </div>
            </div>

            <div>
                <div className='row'>
                    <div className='col'>
                        <h3>🛎 Upcoming duties</h3>
                    </div>
                </div>
                <div className='row'>
                    <div className='col'>
                        {
                            miner.nextDeadlines &&
                            <div className='row'>
                                {
                                    miner.nextDeadlines.slice(0,10).map(d =>
                                        <div className='container'>
                                            <div className='row'>
                                                <div className='col-2'>
                                                    In {(d - head.Height)} epochs
                                                </div>
                                                <div className='col'>
                                                    WindowPoSt in  epochs {(d - head.Height)*30/60/60}h
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        }
                    </div>
                    <div className='col'>
                        {
                            miner.preCommitDeadlines &&
                            <div className='row'>
                                {
                                    miner.preCommitDeadlines.slice(0,10).map(d =>
                                        <div className='container'>
                                            <div className='row'>
                                                <div className='col-2'>
                                                    in {(d.Expiry - head.Height)} epochs
                                                </div>
                                                <div className='col'>
                                                    {d.Sectors.length} Prove Commits  {(d.Expiry - head.Height)*30/60/60}h
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
