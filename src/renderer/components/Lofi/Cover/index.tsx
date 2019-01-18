import * as React from 'react';
import { ipcRenderer, remote } from 'electron'
import * as electronLocalshortcut from 'electron-localshortcut';
import * as path from 'path';
import * as url from 'url';
import * as _ from 'lodash';
import Menu from './../Menu';
import Controls from './Controls';
import TrackInfo from './TrackInfo';
import Visualizer from './Visualizer';
import './style.scss';

enum VISUALIZATION_TYPE {
  NONE,
  SMALL,
  BIG
}

class Cover extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      cover_art: '',
      visWindow: null,
      visualizationType: VISUALIZATION_TYPE.NONE
    }
  }

  componentDidMount() {
    const intervalId = setInterval(() => this.listeningTo(), 5000);
    this.setState({ intervalId });
    this.listeningTo();
  }

  async listeningTo() {
    let res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      method: 'GET',
      headers: new Headers({
        'Authorization': 'Bearer '+ this.props.token
      })
    });
    const currently_playing = await res.json();
    console.log(currently_playing);
    this.setState({
      cover_art: currently_playing.item.album.images[0].url,
      track: currently_playing.item.name,
      artist: _.map(currently_playing.item.artists, 'name').join(", ")
    });

    if (this.state.bigVisualization) {
      this.state.visWindow.webContents.send('currently-playing', currently_playing);
    }
  }

  closeApp() {
    if (this.state.visWindow) {
      this.state.visWindow.close();
    }
    let mainWindow = remote.getCurrentWindow()
    mainWindow.close()
  }

  cycleVisualizationType() {
    switch (this.state.visualizationType) {
      case VISUALIZATION_TYPE.NONE:
        this.setState({
          visWindow: null,
          visualizationType: VISUALIZATION_TYPE.SMALL
        });
        break;
      case VISUALIZATION_TYPE.SMALL:
        const BrowserWindow = remote.BrowserWindow;
        const visWindow = new BrowserWindow({ width: 1, height: 1 });
        visWindow.setPosition(remote.getCurrentWindow().getPosition()[0], remote.getCurrentWindow().getPosition()[1]);
        visWindow.setMenuBarVisibility(false);
        visWindow.loadURL(
          url.format({
            pathname: path.join(__dirname, './visualizer.html'),
            protocol: 'file:',
            slashes: true,
          })
        );
        visWindow.on('close', () => {
          this.setState({
            visWindow: null,
            bigVisualization: false
          })
        });
        visWindow.setSimpleFullScreen(true);
        this.setState({
          visWindow,
          visualizationType: VISUALIZATION_TYPE.BIG
        });
        break;
      case VISUALIZATION_TYPE.BIG:
        this.state.visWindow.close();
        this.setState({
          visWindow: null,
          visualizationType: VISUALIZATION_TYPE.NONE
        });
        break;
      default:
    }
  }

  visIconFromType() {
    switch (this.state.visualizationType) {
      case VISUALIZATION_TYPE.NONE:
        return 'fa-expand';
      case VISUALIZATION_TYPE.SMALL:
        return 'fa-expand-arrows-alt';
      case VISUALIZATION_TYPE.BIG:
        return 'fa-compress-arrows-alt';
      default:
        return '';
    }
  }

  render() {
    return (
      <>
        <Menu parent={this} visIcon={this.visIconFromType()}/>
        <TrackInfo track={this.state.track} artist={this.state.artist} />
        <div className='cover full' style={{ backgroundImage: 'url(' + this.state.cover_art + ')' }} />
        <Visualizer show={this.state.visualizationType === VISUALIZATION_TYPE.SMALL} data={ this.state } />
        <Controls token={this.props.token} />
      </>
    );
  }
}

export default Cover;
