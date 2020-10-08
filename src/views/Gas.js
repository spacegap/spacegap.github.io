import React, { useState, useEffect } from 'react'
import { withRouter } from 'react-router-dom'

// number of consecutive block we take the average from 
const averageLength = 1

function Gas({client,head}) {
    const [avgGas, setAvgGas] = useState({wpost: 0, prove: 0, pre: 0})
    const [stats, setStat] = useState(undefined)

    const initStats = async () => {
        const newStats = new Stats(client, averageLength, head)
        await newStats.fetchCids()
        setStat(newStats)
        return newStats
    }

    const updateAverage = async () =>  {
        const nstats = await initStats()
        const wpost = await nstats.avgGasOfMethod(5)
        const pre = await nstats.avgGasOfMethod(6)
        const prove = await nstats.avgGasOfMethod(7)
        setAvgGas({...avgGas, wpost: wpost, pre: pre, prove: prove})
    }

    useEffect( () => {
        updateAverage()
    })

    return (
        <div className="row">
            <div className="col-3"> </div>
            <div className="col-6">
                <table className="table">
                    <tbody>
                        <GasIndicator name="Average gas of WindowPoSt tx:" value={avgGas.wpost} />
                        <GasIndicator name="Average gas of PreCommit tx:" value={avgGas.pre} />
                        <GasIndicator name="Average gas of ProveCommit tx:" value={avgGas.prove} />
                    </tbody>
                </table>
            </div>
            
        </div>
    )
}

function GasIndicator(props) {
    return (
        <tr> 
            <td> {props.name} </td>
            <td> {props.value} </td>
        </tr>
    )
}

export default withRouter(Gas)

class Stats {
    constructor(client, average,head) {
        this.fetcher = client
        this.average = average
        this.head = head
        this.tipsets = {}
    }

    // XXX Make head a paramter and fethc only what it needs
    async fetchCids() {
        // at the moment take the first block - this is ok since parent tipset
        // is the same for all the blocks
        console.log("Initializing gas stats engine")
        const head = await this.fetcher.fetchHead()
        const height = head.Height
        this.tipsets[head.Height] = head 
        for (var i= 1; i < this.average; i++) {
            const tipset = await this.fetcher.fetchTipsetHead(height - i)
            this.tipsets[tipset.Height] = tipset
            console.log(i,"/",this.average,": init fetched tipset at height ", tipset.Height, " with [0] = ",tipset)
        }
        console.log("Stats: got " + this.tipsets.length + " tipset CIDs to make stats from")
    }

    async avgGasUsedPerHeightFor(...methods) {
        var avg = 0
        for (const [height,tipset] in Object.entries(this.tipsets)) { 
            const msgs = await this.fetcher.parentAndReceiptsMessages(tipset.Cids[0],...methods)
            avg += msgs.reduce((total,v) => total + v[1].GasUsed, 0)
        }
        return avg/this.cids.length
    }

    async avgGasOfMethod(method) {
        var avg = 0
        var nboftx = 0
        console.log("TIPSET ARE ",this.tipsets)
        for (var height in this.tipsets) {
            const tipset = this.tipsets[height]
            console.log("TIPSET is ", tipset)
            const msgs = await this.fetcher.parentAndReceiptsMessages(tipset.Cids[0],method)
            avg += msgs.reduce((total,v) => total + v[1].GasUsed,0)
            nboftx += msgs.length
        }
        return avg/nboftx
    }

}
