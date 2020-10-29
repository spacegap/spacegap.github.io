import React, { useState, useEffect, useRef } from 'react'
import { withRouter } from 'react-router-dom'
import Chart from 'chart.js'
import Stats, {
  objectMap,
  objectFilter,
  growthRate,
  wpostToSectors,
  msgToGasUsed,
  msgToGasLimit,
  msgToGasFeeCap,
} from '../services/filecoin/stats'

// number of consecutive block we take the average from
const averageLength = 3

function Gas ({ client, head }) {
  const [stats, setStat] = useState()

  const updateStats = async () => {
    const s = new Stats(client, averageLength)
    await s.fetchCids()
    setStat(s)
  }

  useEffect(() => {
    updateStats()
  }, [client, head])

  if (!stats) return <></>

  return (
    <div className='row'>
      <div className='accordion col-12' id='accordionExample'>
        <GrowthCard nstats={stats} head={head} />
        <MinerInfoCard nstats={stats} />
        <BiggestGasSpenderCard nstats={stats} head={head} />
        <GasTableCard nstats={stats} head={head} />
      </div>
    </div>
  )
}

function GrowthCard ({ nstats, head }) {
  const [commits, setCommits] = useState({})
  const [wposts, setWposts] = useState({})
  const [graph, setGraph] = useState(undefined)
  const maxRounds = 30
  const canvasRef = useRef(null)
  const cardRef = useRef(null)

  const setCollapseEvent = g => {
    cardRef.current.addEventListener('show.bs.collapse', function () {
      g.update()
    })
    cardRef.current.addEventListener('hide.bs.collapse', function () {
      g.update()
    })
  }

  const options = {
    title: {
      display: true,
      text: 'Growth rate and proven sectors'
    },
    scales: {
      yAxes: [
        {
          id: 'commits',
          type: 'linear',
          position: 'left',
          scaleLabel: {
            labelString: 'Estimated Growth Rate (PB/day) ',
            display: true
          }
        },
        {
          id: 'wposts',
          type: 'linear',
          position: 'right',
          scaleLabel: {
            labelString: 'Estimated Sectors Proven per height',
            display: true
          }
        }
      ]
    }
  }

  const fillDataset = async () => {
    const allSealed = await nstats.transactionsPerHeight(7)
    const allProven = await nstats.transactionsPerHeight(5)
    // convert those to only the number of transactions per height
    const sealed = Object.fromEntries(
      objectMap(allSealed, (v, k) => [k, v.length])
    )
    const proven = Object.fromEntries(
      objectMap(allProven, (v, k) => [k, v.length])
    )
    // merge what we have with potentially new stuff - overwrite old data
    // with new data if same height
    const newCommits = { ...commits, ...sealed }
    const newWposts = { ...wposts, ...proven }
    // sort in decreasing order, take some of it then show it in reverse
    // order
    const rounds = objectMap(newCommits, (v, k) => k)
      .sort((a, b) => b - a)
      .slice(0, maxRounds)
      .reverse()
    // filter only rounds selected and convert to growth rate
    const filteredCommits = objectFilter(newCommits, (v, k) =>
      rounds.includes(k)
    )
    setCommits(filteredCommits)
    const dataCommits = rounds
      .map(r => filteredCommits[r])
      .map(c => Math.round(growthRate(c)))
    // filter only rounds selected and convert to number of sectors
    const filteredPosts = objectFilter(newWposts, (v, k) => rounds.includes(k))
    setWposts(filteredPosts)
    const dataWposts = rounds
      .map(r => filteredPosts[r])
      .map(w => Math.round(wpostToSectors(w)))
    var myGraph = graph
    if (myGraph == undefined) {
      const dataset = [
        {
          data: dataCommits,
          borderColor: chartColors.blue,
          fill: false,
          label: 'Estimated growth rate in PB per day',
          yAxisID: 'commits'
        },
        {
          data: dataWposts,
          borderColor: chartColors.red,
          fill: false,
          label: 'Estimated number of proven sectors per height',
          yAxisID: 'wposts'
        }
      ]
      const lineData = {
        datasets: dataset,
        labels: rounds
      }
      const ctx = canvasRef.current.getContext('2d')
      const newGraph = new Chart(ctx, {
        type: 'line',
        data: lineData,
        options: options
      })
      myGraph = newGraph
      setCollapseEvent(myGraph)
    } else {
      myGraph.data.datasets[0].data = dataCommits
      myGraph.data.datasets[1].data = dataWposts
      myGraph.data.labels = rounds
      myGraph.update()
    }
    setGraph(myGraph)
  }

  useEffect(() => {
    fillDataset()
  }, [head, nstats])

  return (
    <div className='card'>
      <div className='card-header' id='growth'>
        <h2>
          <button
            className='btn btn-link'
            type='button'
            data-toggle='collapse'
            data-target='#collapseGrowth'
            aria-expanded='true'
            aria-controls='collapseBiggest'
          >
            Growth evolution
          </button>
        </h2>
      </div>
      <div
        id='collapseGrowth'
        ref={cardRef}
        className='collapse'
        aria-labelledby='growth'
        data-parent='#accordionExample'
      >
        <div className='card-body'>
          <div className='col-12'>
            {graph == undefined && <p> Loading.... </p>}
            <canvas ref={canvasRef}>Loading...</canvas>
          </div>
        </div>
      </div>
    </div>
  )
}

function MinerInfoCard ({ nstats }) {
  const headers = [
    'Miner',
    'Raw Byte Power',
    'Ratio over total raw power',
    'Size',
    'Daily gas required (wpost)',
    'Daily price FIL'
  ]

  const [minerAddr, setAddr] = useState('')
  const [data, setData] = useState({})

  const drawHeaders = v => v.map(h => <th key={h}> {h} </th>)
  const searchMiner = async e => {
    e.preventDefault()
    console.log('search miner for ', minerAddr)
    const res = await nstats.minerInfo(minerAddr)
    setData(res)
  }

  return (
    <div className='card'>
      <div className='card-header' id='minerInfo'>
        <h2>
          <button
            className='btn btn-link'
            type='button'
            data-toggle='collapse'
            data-target='#collapseInfo'
            aria-expanded='true'
            aria-controls='collapseInfo'
          >
            Miner info search
          </button>
        </h2>
      </div>
      <div
        id='collapseInfo'
        className='collapse'
        aria-labelledby='minerInfo'
        data-parent='#accordionExample'
      >
        <div className='card-body'>
          <div className='row'>
            <div className='col-4'> </div>
            <form>
              <div className='form-group'>
                <label for='minerAddress'>Miner address</label>
                <input
                  value={minerAddr}
                  onChange={e => setAddr(e.target.value)}
                  type='text'
                  className='form-control'
                  placeholder='Enter miner address'
                />
              </div>
              <button
                onClick={searchMiner}
                type='submit'
                className='btn btn-primary'
              >
                Search
              </button>
            </form>
          </div>
          <div className='row'>
            <div className='col-12'>
              <table className='table table-hover'>
                <thead>
                  <tr>{drawHeaders(headers)}</tr>
                </thead>
                <tbody>
                  <tr>
                    <td> {minerAddr} </td>
                    <td> {data.raw} </td>
                    <td> {data.ratio} </td>
                    <td> {data.size} </td>
                    <td> {data.dailyGas} </td>
                    <td> {data.maxDailyPrice} </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BiggestGasSpenderCard ({ head, nstats }) {
  const [dataset, setData] = useState({})
  const [opts, setOpts] = useState({})
  const [pie, setPie] = useState(undefined)
  const maxUser = 10
  const canvasRef = useRef(null)
  const cardRef = useRef(null)

  const setCollapseEvent = pie => {
    cardRef.current.addEventListener('show.bs.collapse', function () {
      pie.update()
    })
    cardRef.current.addEventListener('hide.bs.collapse', function () {
      pie.update()
    })
  }

  const fillDataset = async () => {
    const allHeights = await nstats.biggestGasUserFor()
    if (Object.keys(allHeights).length < 1) {
      return
    }
    const sortedHeight = Object.keys(allHeights).sort((a, b) => b - a)
    const data = allHeights[sortedHeight[0]]
    const rawData = data.slice(0, maxUser).map(d => d[1])
    const datasets = [
      {
        data: rawData,
        backgroundColor: objectMap(chartColors, (color, name) => color).slice(
          0,
          maxUser
        ),
        label: 'transaction gas'
      }
    ]
    const labels = data.slice(0, maxUser).map(d => d[0])
    const newOpts = {
      title: {
        display: true,
        text: `Gas usage at height ${sortedHeight[0]}`
      }
    }
    const newDataset = {
      datasets: datasets,
      labels: labels
    }
    setOpts(newOpts)
    setData(newDataset)

    var myPie = pie
    if (myPie == undefined) {
      const ctx = canvasRef.current.getContext('2d')
      const newPie = new Chart(ctx, {
        type: 'doughnut',
        data: newDataset,
        options: newOpts
      })
      myPie = newPie
      setCollapseEvent(myPie)
    } else {
      pie.data.datasets[0].data = rawData
      pie.options = newOpts
      pie.update()
    }
    setPie(myPie)
  }

  useEffect(() => {
    fillDataset()
  }, [head, nstats])

  return (
    <div className='card'>
      <div className='card-header' id='biggestGas'>
        <h2>
          <button
            className='btn btn-link'
            type='button'
            data-toggle='collapse'
            data-target='#collapseBiggest'
            aria-expanded='true'
            aria-controls='collapseBiggest'
          >
            Biggest gas users
          </button>
        </h2>
      </div>
      <div
        id='collapseBiggest'
        ref={cardRef}
        className='collapse'
        aria-labelledby='biggestGas'
        data-parent='#accordionExample'
      >
        <div className='card-body'>
          <div className='col-12'>
            {pie == undefined && <p> Loading.... </p>}
            <canvas ref={canvasRef}>Loading...</canvas>
          </div>
        </div>
      </div>
    </div>
  )
}

function GasTableCard ({ nstats, head }) {
  const headers = [
    '',
    'Average Count',
    'Average GasUsed ',
    'Ratio over total GasUsed',
    'Average GasLimit',
    'Ratio avg over total GasLimit',
    'Ratio GasUsed over GasLimit',
    'Ratio GasUsed over BlockLimit',
    'Ratio GasLimit over BlockLimit'
  ]
  const empty = Array(headers.length - 1).fill(0)
  const [avgGas, setAvgGas] = useState({
    headers: headers,
    total: empty,
    wpost: empty,
    pre: empty,
    prove: empty
  })

  const updateAverage = async nstats => {
    const totalUsed = await nstats.avgTotal(msgToGasUsed)
    const totalLimit = await nstats.avgTotal(msgToGasLimit)

    const computeEntry = async (...method) => {
      const nTx = await nstats.avgNumberTx(...method)
      const gasUsed = await nstats.avgValue(msgToGasUsed,...method)
      const gasLimit = await nstats.avgValue(msgToGasLimit,...method)
      // total gas used for this method in average per epoch
      const mtotalUsed = await nstats.avgTotal(msgToGasUsed, ...method)
      const mtotalLimit = await nstats.avgTotal(msgToGasLimit, ...method)
      const ratioUsed = mtotalUsed / totalUsed
      const ratioLimit = mtotalLimit / totalLimit
      const ratioUsedLimit = mtotalUsed / mtotalLimit
      const ratioUsedBlockLimit = await nstats.avgTotalGasUsedOverTipsetLimit(
        ...method
      )
      const ratioBlockLimit = await nstats.avgTotalGasLimitOverTipsetLimit(
        ...method
      )
      return [
        nTx,
        gasUsed,
        ratioUsed,
        gasLimit,
        ratioLimit,
        ratioUsedLimit,
        ratioUsedBlockLimit,
        ratioBlockLimit
      ]
    }
    const results = {}
    results.headers = headers
    results.total = await computeEntry()
    results.wpost = await computeEntry(5)
    results.pre = await computeEntry(6)
    results.prove = await computeEntry(7)
    setAvgGas(results)
  }

  useEffect(() => {
    updateAverage(nstats)
  }, [nstats, head])

  const drawHeaders = v => v.map(h => <th key={h}> {h} </th>)

  return (
    <div className='card'>
      <div className='card-header' id='headingOne'>
        <h2>
          <button
            className='btn btn-link'
            type='button'
            data-toggle='collapse'
            data-target='#collapseOne'
            aria-expanded='false'
            aria-controls='collapseOne'
          >
            Gas usage table
          </button>
        </h2>
      </div>
      <div
        id='collapseOne'
        className='collapse'
        aria-labelledby='headingOne'
        data-parent='#accordionExample'
      >
        <div className='card-body'>
          <div className='row'>
            <p>
              {' '}
              This table shows different statistics about the gas usage per
              epoch. All results are averaged accross the last
              {averageLength} epochs. You can find a complete description of
              each column below the table.{' '}
            </p>
            <div className='row'>
              <div className='col-12'>
                <table className='table table-hover'>
                  <thead>
                    <tr>{drawHeaders(avgGas.headers)}</tr>
                  </thead>
                  <tbody>
                    <RowInfo name='All transactions:' values={avgGas.total} />
                    <RowInfo name='WindowPoSt:' values={avgGas.wpost} />
                    <RowInfo name='PreCommit:' values={avgGas.pre} />
                    <RowInfo name='ProveCommit:' values={avgGas.prove} />
                  </tbody>
                </table>
              </div>
            </div>
            <div className='row'>
              <div className='col-0'> </div>
              <div className='col-11'>
                <ul className='list-group list-group-flush'>
                  <li className='list-group-item'>
                    <b>Average Count:</b> number of transaction per epoch in
                    average of the method{' '}
                  </li>
                  <li className='list-group-item'>
                    <b>Average GasUsed:</b> gas used per transaction of the
                    method
                  </li>
                  <li className='list-group-item'>
                    <b>Ratio over total GasUsed:</b> Precedent number divided by
                    the total gas used in avg per epoch
                  </li>
                  <li className='list-group-item'>
                    <b>Average GasLimit:</b> gas limit set per transaction of
                    the method
                  </li>
                  <li className='list-group-item'>
                    <b>Ratio over total GasLimit:</b> Precedent number divided
                    by the total gas limit in avg per epoch
                  </li>
                  <li className='list-group-item'>
                    <b>Ratio GasUsed over GasLimit:</b> Total gas used for the
                    method over total gas limit in avg per epoch
                  </li>
                  <li className='list-group-item'>
                    <b>Total GasUsed over BlockLimit:</b> Total gas used divided
                    by total gas limit set per epoch computed with number of blocks
                  </li>
                  <li className='list-group-item'>
                    <b>Total GasLimit over BlockLimit:</b> Total gas limit 
                    divided by total gas limit set per epoch computed with number 
                    of blocks per epoch
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// RowInfo is simply a row of the table filled by the main table
function RowInfo (props) {
  const showValues = vv =>
    vv.map((v, idx) => (
      <td key={idx.toString()}>
        {isNaN(v) || Math.ceil(v) === v ? v : v.toFixed(2)}
      </td>
    ))

  return (
    <tr>
      <td> {props.name} </td>
      {showValues(props.values)}
    </tr>
  )
}

export default withRouter(Gas)

const chartColors = {
  red: 'rgb(255, 99, 132)',
  orange: 'rgb(255, 159, 64)',
  yellow: 'rgb(255, 205, 86)',
  green: 'rgb(75, 192, 192)',
  blue: 'rgb(54, 162, 235)',
  purple: 'rgb(153, 102, 255)',
  grey: 'rgb(201, 203, 207)'
}
