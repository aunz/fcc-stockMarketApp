import React, { Component, Fragment } from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'
import Highstock from 'highcharts/highstock.src'

import './styles/index.css'

class App extends Component {
  constructor(props) {
    super(props)
    const today = new Date()
    // start_date for quandl API
    this.start_date = (today.getFullYear() - 5) + '-' + (today.getMonth() + 1) + '-' + today.getDay()
    // this.end_date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDay()
    this.end_date = '9999-12-31'
    this.state = {
      symbols: '', // stock symbols, such as AAPL,GOOG; strings seperated by comma
      series: {}, // { AAPL: { name: 'AAPL', data: [data], _loading: Boolean, _error: Error }, GOOG: { name: 'GOOG', data: [data]} } // same API for highstock charting
      loading: false,
    }
    this.syncSymbols = ''
    this.stream()
  }
  componentWillUnmount() {
    this.source.removeEventListener('message', this.onStream)
    this.source = null
  }
  onStream = e => {
    const symbols = e.data.split(',').filter(el => el.trim()).join(',')
    if (this.syncSymbols === symbols) return
    this.syncSymbols = symbols
    this.setState({ symbols })
    this.getData(symbols)
  }
  getData(symbols) {
    const updateSymbols = () => {
      this.setState({ symbols: this.syncSymbols })
    }
    symbols.split(',').forEach(symbol => {
      if (symbol in this.state.series) {
        updateSymbols()
        return
      }
      this.state.series[symbol] = { loading: true } // directly mutate the state
      fetch('https://www.quandl.com/api/v3/datasets/WIKI/' + symbol + '/data.json?start_date=' + this.start_date + '&end_date=' + this.end_date + '&column_index=1')
      // fetch('/testData/' + symbol)
        .then(r => r.json())
        .then(r => {
          if (r.quandl_error) throw new Error(r.quandl_error.code)
          const { data } = r.dataset_data
          data.forEach(el => { el[0] = (new Date(el[0])).getTime() })
          data.sort((a, b) => a[0] - b[0])
          this.state.series[symbol] = { // directly mutate the state
            id: symbol,
            name: symbol,
            data
          }
        })
        .catch(e => {
          this.state.series[symbol] = {
            errorMessage: e.message === 'QECx02'
              ? `The code "${symbol}" you submitted cannot be found`
              : 'Oops, there is an error processing your request'
          }
        })
        .then(updateSymbols)
    })
  }
  updateSymbol = (symbol, method = 'post', cb) => { // method in [post | delete]
    symbol = symbol.replace(/[^a-zA-Z_]/g, '').toUpperCase()
    if (!symbol) return
    const symbols = this.syncSymbols.split(',')
    const index = symbols.indexOf(symbol)
    const isPost = method === 'post'
    if (isPost) {
      if (index > -1) return
      symbols.push(symbol)
    } else {
      if (index === -1) return // probably won't exist if the UI is configured correctly, i.e only show existing symbols
      symbols.splice(index, 1)
      if (this.state.series[symbol].errorMessage) delete this.state.series[symbol]
    }
    this.syncSymbols = symbols.join(',')
    isPost ? this.setState({ loading: true }) : this.setState({ symbols: this.syncSymbols })
    fetch('/stream/' + symbol, { method })
      .then(() => {})
      .catch(() => {})
      .then(() => {
        if (isPost) {
          this.setState({ symbols: this.syncSymbols }, () => {
            this.getData(symbol)
            cb && cb()
          })
        }
      })
      .catch(() => {})
      .then(() => {
        this.setState({ loading: false })
      })
  }
  stream() {
    this.source = new EventSource('/stream')
    this.source.addEventListener('message', this.onStream)

    // source.addEventListener('open', function (e) {
    //   console.log('Connection was opened', e.data)
    // }, false)

    // source.addEventListener('error', function (e) {
    //   if (e.readyState === EventSource.CLOSED) {
    //     console.log('Connection was closed', e)
    //   }
    // }, false)

    // source.addEventListener('connections', function (e) {
    //   console.log('uptimes', e)
    // }, false)
  }
  render() {
    const { symbols, series, loading } = this.state
    return (
      <Fragment>
        <Chart symbols={symbols} series={series} />
        <div className="flex flex-wrap">
          <Input
            symbols={symbols}
            cb={this.updateSymbol}
            loading={loading}
          />
          <Symbols
            symbols={symbols}
            series={series}
            cb={this.updateSymbol}
          />
        </div>
      </Fragment>
    )
  }
}


class Chart extends Component {
  static propTypes = {
    series: PropTypes.object.isRequired,
  }

  componentDidMount() {
    this.chart = Highstock.stockChart('chart', {
      series: [{ name: '__initial_' }],
      // chart: {
      //   events: {
      //     redraw: () => {
      //       console.log('dedraw')
      //     }
      //   }
      // }
    })
  }
  shouldComponentUpdate(nextProp) {
    this.updatePlot(nextProp.symbols)
    return false
  }
  updatePlot(symbols) {
    symbols = symbols.split(',')
    let shouldRedraw = false

    // remove those not in symbols
    this.chart.series.forEach(s => {
      if (!symbols.includes(s.name) && s.name !== 'Navigator 1') {
        s.remove(false) // do not redraw yet
        shouldRedraw = true
      }
    })

    // add or update new series
    symbols.forEach(symbol => {
      if (this.chart.get(symbol)) return
      const d = this.props.series[symbol]
      if (!d || !d.name) return
      this.chart.addSeries({ ...d }, false) // shallow clone the data, becos highchart mutate it
      shouldRedraw = true
    })

    shouldRedraw && this.chart.redraw()
  }
  render() {
    return <div id="chart" />
  }
}

class Symbols extends Component {
  static propTypes = {
    symbols: PropTypes.string.isRequired,
    series: PropTypes.object.isRequired,
    cb: PropTypes.func.isRequired,
  }
  render() {
    const wikiCodes = require('./wikiCodeFromQuandl.json')
    const { symbols, cb, series } = this.props
    const className = 'mx2 my1 p2 border border-silver'
    const style = { width: '16rem', height: '10rem' }
    const btn = 'btn border-none outline-none bg-transparent pointer bold right'

    return symbols.split(',').filter(e => !!e).map(symbol => {
      const s = series[symbol]
      const error = s && s.errorMessage
      const l = !s || s.loading
      return (
        <div
          key={symbol}
          className={className}
          style={style}
        >
          <h2 className="mt0 color1">
            {symbol}
            <button
              className={btn + ' h3 silver'}
              onClick={() => { cb(symbol, 'delete') }}
            >
              ✖
            </button>
          </h2>
          <span className={l ? 'animate-spin' : ''} style={l ? { fontFamily: 'fontello' } : {}}>
            {l ? '\ue839' : wikiCodes[symbol]}
          </span>
          <span className="mt1 block red">{error}</span>
        </div>
      )
    })
  }
}

class Input extends Component {
  static propTypes = {
    symbols: PropTypes.string.isRequired,
    cb: PropTypes.func.isRequired,
    loading: PropTypes.bool,
  }
  state = {
    symbol: '',
    errorMessage: ''
  }
  wikiCodes = require('./wikiCodeFromQuandl.json')
  codes = Object.keys(require('./wikiCodeFromQuandl.json')).join(',')
  submit = e => {
    e && e.preventDefault()
    const symbol = this.state.symbol.replace(/[^a-zA-Z_]/g, '').toUpperCase()
    this.setState({ errorMessage: '' })

    if (!symbol) return
    if (this.props.symbols.split(',').includes(symbol)) {
      this.setState({ errorMessage: `"${symbol}" is already on the list`})
      return
    }
    if (!(symbol in this.wikiCodes)) {
      this.setState({ errorMessage: `"${symbol}" cannot be found` })
      return
    }
    this.props.cb(symbol, 'post', () => {
      this.setState({ symbol: '' })
    })
  }
  render() {
    const { loading } = this.props
    const { errorMessage, symbol } = this.state
    const className = 'mx2 my1 p2 border border-silver'
    const className2 = 'p1 center bg-white pointer'
    const style = { width: '16rem', height: '10rem' }
    const style2 = { borderBottom: '1px solid silver' }
    const btn = 'btn border-none outline-none bg-transparent pointer bold right'
    const s = symbol.replace(/[^a-zA-Z_]/g, '').toUpperCase()
    const re = s && new RegExp('\\b' + s + '([^,])*', 'g')

    return (
      <form
        className={className + ' flex flex-column relative'}
        style={style}
        onSubmit={this.submit}
      >
        <input
          className="p1 col-12 outline-none appearance-none border border-color1 center bold"
          placeholder="Stock code"
          type="text"
          list="symbols"
          value={symbol}
          onChange={e => { this.setState({ symbol: e.currentTarget.value }) }}
        />
        {re && (
          <div
            className="absolute mx2"
            style={{ left: 0, right: 0, transform: 'translateY(36px)', maxHeight: '10rem', overflowY: 'auto' }}
          >
            {(this.codes.match(re) || []).map(el => (
              <div // eslint-disable-line
                key={el}
                className={className2}
                style={style2}
                onClick={() => {
                  // this.setState({ symbol: el })
                  this.state.symbol = el
                  this.submit()
                }}
              >
                {el}
              </div>
            ))}
          </div>
        )}
        <input
          className={'m1 bg-transparent border-none outline-none pointer color1 ' + (loading ? 'animate-spin' : '')}
          style={{ fontFamily: 'fontello' }}
          disabled={loading}
          type="submit"
          value={loading ? '\ue839' : '\ue800'}
        />
        {errorMessage && (
          <span className="center red">
            {errorMessage}
            <button
              className={btn + ' red'}
              onClick={() => { this.setState({ errorMessage: '' }) }}
            >
              ✖
            </button>
          </span>
        )}
      </form>
    )
  }
}

render(<App />, document.getElementById('root'))

if (module.hot) module.hot.accept()
