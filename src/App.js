import logo from './images/logo.svg';
import './App.css';
import React, { Component, useState } from 'react';
import ProTip from './ProTip';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow';
import SearchIcon from '@mui/icons-material/Search';
import { 
    AppBar, Paper, InputBase, IconButton, Container,
    Toolbar, Typography, Box, Link, CssBaseline 
} from '@mui/material';

const bungie_api_key = '7a7ced859e604e08854b0bd201ad4561';
const bungie_client_id = '42437';
const bungie_client_secret = 'n6EG45JUcxegh2xomH777l0zDARggXT2EN.6tp4vSK4';
const base_URL = 'https://www.bungie.net/'
const parametersGET = {
    method: 'GET',
    headers: {
      'x-api-key' : bungie_api_key
    }
  };

const searchForCharacter = async (searchStr) => {
    let username = searchStr;
    let search_URL = 'Platform/Destiny2/SearchDestinyPlayer/-1/';
    let mod_username = username.replace("#", "%23");
    let search_full_URL = base_URL + search_URL + mod_username;
    let parameters = {
      method: 'GET',
      headers: {
        'x-api-key' : bungie_api_key
      }};

    console.log("search_full_URL");
    console.log(search_full_URL);

    let data = await callAPI(search_full_URL, parameters);
    console.log("searchForCharacter");
    console.log(data);

    if(data.Message.includes('maintenance'))
      console.log("Try again later.")
    else
        getCharacters(data);
};

const getCharacters = async (data) => {
    let membership_id = data.Response[0].membershipId;
    let membership_type = data.Response[0].membershipType;
    let displayName = data.Response[0].bungieGlobalDisplayName;
    let displayNameCode = data.Response[0].bungieGlobalDisplayNameCode;
    let displayName_full = displayName + '#' + displayNameCode;
    let profile_data = await getProfile(membership_id, membership_type);
    console.log("getProfile data");
    console.log(profile_data);
    let characters = Object.keys(profile_data.Response.characters.data);
    let emblemPath = [];
    let lightLevel = [];
    let classType = [];
    let classTypeString = [];
    let raidData = [];
    let allRaidData = [];
    let totalClears = 0;
    let allCompletedData = [];
    let ruinedFlawlesses = [];

    for (let i = 0; i < characters.length; i++) {
        emblemPath.push(profile_data.Response.characters.data[characters[i]].emblemBackgroundPath);
        lightLevel.push(profile_data.Response.characters.data[characters[i]].light);
        classType.push(profile_data.Response.characters.data[characters[i]].classType);
  
        if(classType[i] === 0)
          classTypeString.push('Titan');
        else if (classType[i] === 1)
          classTypeString.push('Hunter');
        else if (classType[i] === 2)
          classTypeString.push('Warlock');
        else
          console.log("Error : classType :: could not resolve class type from number. ClassType = " + classType);
  
        raidData = await getActivities(membership_id, membership_type, characters[i], 'dungeon');
        allRaidData = allRaidData.concat(raidData);
  
        let clearsPerCharacter = 0;
  
        for(let j = 0; j < raidData.length; j++) {
          if(raidData[j][0] == '2823159265' && raidData[j][2] == 'Yes') {
            totalClears++;
            clearsPerCharacter++;
  
            let completedData = await getActivityPostGame(raidData[j][[1]]);
  
            if(completedData.Response.activityWasStartedFromBeginning){
              let raidDeaths = 0;
              let flawless = true;
              let firstDeath = '';
              let deathsByFirstDeath = 0;
  
              for (let k = 0; k < (completedData.Response.entries).length; k++){
                let characterDeaths = completedData.Response.entries[k].values.deaths.basic.value;
                
                if (characterDeaths > 0 && raidDeaths === 0){
                  firstDeath = completedData.Response.entries[k].player.destinyUserInfo.bungieGlobalDisplayName;
                  deathsByFirstDeath = characterDeaths;
                }
  
                raidDeaths += characterDeaths;
              }
              allCompletedData = allCompletedData.concat(completedData);
              
              if (raidDeaths > 0)
                flawless = false;
              
              if (deathsByFirstDeath === raidDeaths){
                /*
                console.log("activityID = " + raidData[j][[1]]);
                console.log("raidDeaths = " + raidDeaths);
                console.log("ruinedBy = " + firstDeath);
                */
                ruinedFlawlesses = ruinedFlawlesses.concat([[raidData[j][[1]],raidDeaths,firstDeath]]);
              }
            }
          }
  
        }
      }
  
      console.log('allCompletedData');
      console.log(allCompletedData);
      console.log('ruinedFlawlesses');
      console.log(ruinedFlawlesses);
};

const callAPI = async(URL, parameters) => {
    const response = await fetch(URL, parameters).catch((err) => console.log(err)) ;
    const data = await response.json();

    return data;    
};

const getProfile = async(membership_id, membership_type) => {
    let profile_URL = 'Platform/Destiny2/' + membership_type + '/Profile/';
    let full_profile_URL = base_URL + profile_URL + membership_id + '/?' + new URLSearchParams({'components' : 'Profiles,Characters,Records'});
    let parameters = {
        method: 'GET',
        headers: {
            'x-api-key' : bungie_api_key
        }
    };

    const data = await callAPI(full_profile_URL,parameters);
    
    return data;
};

const getActivities = async(membership_id, membership_type, characteer_id, mode) => {
    let i = 0;
    let raid_URL = base_URL + 'Platform/Destiny2/' + membership_type + '/Account/' + membership_id + '/Character/' + characteer_id + '/Stats/Activities/?page=' + i + '&mode=' + mode + '&count=250';
    let parameters = {
      method: 'GET',
      headers: {
        'x-api-key' : bungie_api_key
      }
    };
    let morePages = true;
    let data = [];
    let response = '';
    let activityIDs = [];
    while(morePages) {
      response = await callAPI(raid_URL, parameters);

      if (response.Response.activities.length < 250)
        morePages = false;
      
      data = data.concat(response.Response.activities);
      i++;
      raid_URL = base_URL + 'Platform/Destiny2/' + membership_type + '/Account/' + membership_id + '/Character/' + characteer_id + '/Stats/Activities/?page=' + i + '&mode=raid&count=250';
    }

    for(let j = 0; j < data.length; j++)
      activityIDs.push([data[j].activityDetails.referenceId,data[j].activityDetails.instanceId,data[j].values.completed.basic.displayValue]);

    return activityIDs;
};

const getActivityPostGame = async(activityID) => {
    let base_URL_stats = 'https://stats.bungie.net/';
    let postgame_URL = 'Platform/Destiny2/Stats/PostGameCarnageReport/';
    let full_URL = base_URL_stats + postgame_URL + activityID + '/';
    let parameters = {
      method: 'GET',
      headers: {
        'x-api-key' : bungie_api_key
      }
    };

    const data = await this.callAPI(full_URL,parametersGET);
    
    return data;
};

const SearchBar = () => {

    const [searchStr, setSearchStr] = useState('');
    const onSubmit = e => {
        e.preventDefault();
        searchForCharacter(searchStr);
     };

    return (
      <Paper
        component="form"
        sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 600 }}
        onSubmit={onSubmit}
      >
        <DoubleArrowIcon fontSize='large' color='#282c34'/>
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="Find a Guardian"
          inputProps={{ 'aria-label': 'Find a Guardian' }}
          onInput={(e) => {
            setSearchStr(e.target.value);
          }}
          value={searchStr}
          type="search"
        />
        <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Paper>
    );
};

const TopToolbar = () => {

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" color='appbar'>
                <Toolbar>
                    <Container fixed={true} align="left">
                        <Typography variant="h5">D2 Flawed Flawless</Typography>
                    </Container>
                    <Container fixed={true} align="center">
                        <SearchBar/>
                    </Container>
                    <Container fixed={true} align="center"></Container>
                </Toolbar>
            </AppBar>
        </Box>
    );
};

const DestinyLogo = () => {
    return(
        <img src='/images/d2logo.png'></img>
    );
};

function Copyright() {
    return (
      <Typography variant="body2" color="text.secondary" align="center">
        {'Copyright © '}
        <Link color="inherit" href="https://marcackermann86.github.io/destinyapp/">
          D2 Flawed Flawless
        </Link>{' '}
        {new Date().getFullYear()}.
      </Typography>
    );
};

class App extends Component {
  state = { username: '' };

  render() {
    const themeLight = createTheme({
        palette: {
          background: {
            default: "#e4f0e2"
          }
        }
      });
      
    const themeDark = createTheme({
        palette: {
          background: {
            default: "#282c34"
          },
          text: {
            primary: "#282c34",
            secondary: "#e4f0e2"
          },
          appbar: {
            main: "#50b2da"
          }
        }
    });

    return (     
        <ThemeProvider theme={themeDark}>
        <CssBaseline />
        <TopToolbar/>
        <Container maxWidth="sm" align="center">
        <Box sx={{ my: 5 }}>
            <img src={logo} id='logoimg' hidden={false} className="App-logo" alt="logo" width="150" height="150"/>
         </Box>
         <footer><Box sx={{ my: 65 }}>
            </Box>
        <Box sx={{ my: 5 }}>
            <ProTip />
            <Copyright />
        </Box>
    </footer>
    </Container>

    </ThemeProvider>
    );
  }
};

export default App;