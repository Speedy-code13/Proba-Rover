import 'dotenv/config'
import type {components} from "./ares-types.js"

type schemas = components['schemas']

const API_URL = process.env.API_URL

const header =  {
    "Authorization" : `Bearer ${process.env.API_KEY}`,
    "Content-Type" : "application/json"
}
async function startGame(){

    const loadout : schemas["Submission"] = {
        mode: "mission",
        depthCamera: false,
        gps: false,
        imu: false,
        sampleDetector: false,
        solarPanel: "none",
        batteryUpgrade: false
    }   

    const newRoundPost = await fetch(`${API_URL}/api/v1/submission`,{
        method: 'PUT',
        headers: header,
        body: JSON.stringify(loadout)
    })

}

async function sendAction(action: string) {
    console.log("Executing "+ action)
    const body = {action: action}

     const post = await fetch(`${API_URL}/api/v1/games/current/actions`, {
        method: 'POST',
        headers: header,
        body: JSON.stringify(body)
    })
}



async function readAndGetJson(path: string) {
    const get = await fetch(`${API_URL}/${path}`, {
        headers: header
    })
    const json = await get.json()
    return json
}

async function getBeacon() : Promise<schemas["BeaconReading"]>{

    let beacon : schemas["BeaconReading"] = await readAndGetJson("api/v1/games/current/beacon") 
    while(beacon.distance == null) //10% failure handling 
        beacon = await readAndGetJson("api/v1/games/current/beacon") 

    return beacon
}


// function calculateBeaconPosition(beacon: schemas["BeaconReading"] ) : Point {
//     const radians = Math.PI / 180 * beacon.bearingDeg!
//     return new Point(Math.cos(radians) * beacon.distance!, Math.sin(radians) * beacon.distance!)

// }

async function waitForRover() : Promise<schemas["GameView"]>{
    while(true){
        const gameState:  schemas["GameView"] = await readAndGetJson("api/v1/games/current")

        if(gameState.activeAction == null) //rover ul e liber
            return gameState;

        await new Promise((resolve) => setTimeout(resolve, 200))

    }

}



let triggerStopGame : boolean = false

await startGame()
let beacon 
let shouldReadBeacon: boolean = true;
let lastTargetReached = 0
while(!triggerStopGame){


    if(shouldReadBeacon)
    {
        beacon = await getBeacon()
        shouldReadBeacon = false
        console.log("Relative angle to next target: "+ beacon?.bearingDeg)
    }
    const bearingDeg  = beacon?.bearingDeg! // stim ca e non-null tho
    if(Math.abs(bearingDeg) >= 45)
    {
        if(bearingDeg < 0)
            await sendAction("rotate_left")
        else
            await sendAction("rotate_right")
        shouldReadBeacon = true
    }
    else{
        await sendAction("move_forward")
        shouldReadBeacon= true
    }

    // if(state != lastState){

    // }

    // lastState = state


    const gameState = await waitForRover()


   // console.log(gameState)
    if(lastTargetReached != gameState.target)
        console.log(`---------------- Am ajuns la target ul ${gameState.target}!!! ----------------`)


    if(gameState.target == 3 || gameState.status == 'finished')
    {
        console.log("Am atins toate 3 tintele!")
        triggerStopGame = true
    }
    else if(gameState.status !='active')
    {
        console.log(`Failed mission, reason: ${gameState.status}`)
    }
   lastTargetReached  = gameState.target

}
