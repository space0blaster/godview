import http from "node:http";
import fs from "node:fs";
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from "openai";
import {Ollama} from 'ollama';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"],
});
const deepSeekApi = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env["DEEPSEEK_KEY"]
});
const openAiApi = new OpenAI({
    apiKey: process.env["OPENAI_KEY"]
});

let searchSystemPrompt='Output in JSON only with keys: "latitude"(location latitude), "longitude" (location longitude), "name" (name of location), "address" (address of location) and  "url" (a related website) if available. Output as array only.';
let discoverSystemPrompt="Keep it brief.";

async function claude(requestType,systemPrompt,prompts) {
    let messages=[];
    let finalSystemPrompt=systemPrompt;
    if(requestType==="search") finalSystemPrompt=systemPrompt+" Do not include any other verbiage besides the json.";
    for(let i=0;i<prompts.length;i++) {
        messages.push(prompts[i]);
    }
    return anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system:finalSystemPrompt,
        messages: messages,
    });
}
async function deepseek(requestType,systemPrompt,prompts) {
    let messages=[];
    let finalSystemPrompt=systemPrompt;
    if(requestType==="search") finalSystemPrompt=systemPrompt + ". Do not include markdown tags.";
    messages.push({role: "system", content: finalSystemPrompt});
    for(let i=0;i<prompts.length;i++) {
        messages.push(prompts[i]);
    }
    return deepSeekApi.chat.completions.create({
        messages: messages,
        model: "deepseek-chat",
    });
}
async function openai(requestType,systemPrompt,prompts) {
    let messages=[];
    let finalSystemPrompt=systemPrompt;
    if(requestType==="search") finalSystemPrompt=systemPrompt + ". Do not include markdown tags.";
    messages.push({role: "system", content: finalSystemPrompt});
    for(let i=0;i<prompts.length;i++) {
        messages.push(prompts[i]);
    }
    return openAiApi.chat.completions.create({
        messages: messages,
        model: "gpt-4o",
        store:false
    });
}
async function local(requestType,systemPrompt,prompts){
    let messages=[];
    let finalSystemPrompt=systemPrompt;
    if(requestType==="search") finalSystemPrompt=systemPrompt + ". Do not include markdown tags.";
    messages.push({role: "system",content:finalSystemPrompt});
    for(let i=0;i<prompts.length;i++) {
        messages.push(prompts[i]);
    }
    const ollama = new Ollama({host:'http://'+process.env["OLLAMA_HOST"]+':'+process.env["OLLAMA_PORT"]})
    return await ollama.chat({ model: process.env["OLLAMA_MODEL"], messages: messages, stream: false })
}

function searchOutput(responsePayload,serverResponse,modelResponse,model) {
    serverResponse.setHeader('Access-Control-Allow-Headers', '*');
    serverResponse.setHeader('Access-Control-Allow-Origin', '*');
    serverResponse.writeHead(200,{'Content-Type':'application/json'});
    let result='';
    if(model==="anthropic") result=modelResponse.content[0].text;
    else if(model==="local") result=modelResponse.message.content;
    else result=modelResponse.choices[0].message.content;
    //
    if(result.includes('```')) {
        result=result.replace('```','');
        result=result.replace('```','');
        if(result.includes('json')) result=result.replace('json','');
    }
    result=JSON.parse(result);
    //
    if(!Array.isArray(result)) {
        responsePayload.data=[];
        responsePayload.data.push(result);
    }
    else responsePayload.data=result;
    serverResponse.write(JSON.stringify(responsePayload));
    return serverResponse.end();
}
function discoverOutput(responsePayload,serverResponse,modelResponse,model) {
    serverResponse.setHeader('Access-Control-Allow-Headers', '*');
    serverResponse.setHeader('Access-Control-Allow-Origin', '*');
    serverResponse.writeHead(200,{'Content-Type':'application/json'});
    let result='';
    if(model==="anthropic") result=modelResponse.content[0].text;
    else if(model==="local") result=modelResponse.message.content;
    else result=modelResponse.choices[0].message.content;
    //
    serverResponse.write(JSON.stringify({data:result}));
    return serverResponse.end();
}
//
function userLocationPrompt(userLocation) {
    return "Convert my location ["+userLocation.latitude+", "+userLocation.longitude+"] to the nearest city and use that city as reference for requests that need my location. Use a 50 mile radius as a baseline."
}

const server=http.createServer((req, serverResponse)=>{
    let b ='';
    let responsePayload={};
    let reqPath=req.url.split('/');
    if(req.url==='/' || ['search','discover'].indexOf(reqPath[1])>-1) {
        fs.readFile('public/index.html',(err, data)=> {
            serverResponse.writeHead(200,{'Content-Type':'text/html'});
            serverResponse.write(data);
            return serverResponse.end();
        });
    }
    else if(req.url.split(".")[2]==="js") {
        fs.readFile('public/'+req.url,(err, data)=> {
            if(err) {
                serverResponse.writeHead(200,{'Content-Type':'application/json'});
                serverResponse.write(JSON.stringify({error:'error retrieving script'}));
            }
            else {
                serverResponse.writeHead(200,{'Content-Type':'text/javascript'});
                serverResponse.write(data);
            }
            return serverResponse.end();
        });
    }
    else if(req.url.split(".")[2]==="css") {
        fs.readFile('public/'+req.url,(err, data)=> {
            if(err) {
                serverResponse.writeHead(200,{'Content-Type':'application/json'});
                serverResponse.write(JSON.stringify({error:'error retrieving stylesheet'}));
            }
            else {
                serverResponse.writeHead(200,{'Content-Type':'text/css'});
                serverResponse.write(data);
            }
            return serverResponse.end();
        });
    }
    else if(req.url.split(".")[1]==="png") {
        fs.readFile('public/'+req.url,(err, data)=> {
            if(err) {
                serverResponse.writeHead(200,{'Content-Type':'application/json'});
                serverResponse.write(JSON.stringify({error:'error retrieving image'}));
            }
            else {
                serverResponse.writeHead(200,{'Content-Type':'image/png'});
                serverResponse.write(data);
            }
            return serverResponse.end();
        });
    }
    else if(req.url.split(".")[1]==="gif") {
        fs.readFile('public/'+req.url,(err, data)=> {
            if(err) {
                serverResponse.writeHead(200,{'Content-Type':'application/json'});
                serverResponse.write(JSON.stringify({error:'error retrieving image'}));
            }
            else {
                serverResponse.writeHead(200,{'Content-Type':'image/gif'});
                serverResponse.write(data);
            }
            return serverResponse.end();
        });
    }
    else if(req.url.split(".")[1]==="json") {
        fs.readFile('public/src/'+req.url,(err, data)=> {
            serverResponse.writeHead(200,{'Content-Type':'text/json'});
            serverResponse.write(data);
            return serverResponse.end();
        });
    }
    else if(reqPath[1]==="api") {
        if(reqPath[2]==='query') {
            req.on('data', (chunk) => {
                b+=chunk;
            });
            req.on('end', () => {
                if(b) {
                    let q=JSON.parse(b)
                    let userPrompt=q.prompt;
                    let modelUsed=q.model || "anthropic";
                    let userLocation=q.myLocation;
                    let messages=[];
                    if(userLocation && userLocation.latitude && userLocation.longitude) messages.push({role:"user",content:userLocationPrompt(userLocation)})
                    messages.push({role:"user",content:userPrompt});
                    if(modelUsed==="anthropic") {
                        claude("search",searchSystemPrompt,messages).then(modelResponse=>{
                            searchOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                    else if(modelUsed==="deepseek") {
                        deepseek("search",searchSystemPrompt,messages).then(modelResponse=>{
                            searchOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                    else if(modelUsed==="openai") {
                        openai("search",searchSystemPrompt,messages).then(modelResponse=>{
                            searchOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                    else if(modelUsed==="local") {
                        local("search",searchSystemPrompt,messages).then(modelResponse=>{
                            searchOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                    else {
                        claude("search",searchSystemPrompt,messages).then(modelResponse=>{
                            searchOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                }
                else {
                    serverResponse.setHeader('Access-Control-Allow-Headers', '*');
                    serverResponse.setHeader('Access-Control-Allow-Origin', '*');
                    serverResponse.writeHead(200,{'Content-Type':'application/json'});
                    serverResponse.write(JSON.stringify('load'));
                    return serverResponse.end();
                }
            });
        }
        else if(reqPath[2]==='discover') {
            req.on('data', (chunk) => {
                b+=chunk;
            });
            req.on('end', () => {
                if(b) {
                    let q=JSON.parse(b)
                    //let userPrompt=q.prompt;
                    let modelUsed=q.model || "anthropic";
                    let messages=[];
                    let userPrompt="Tell me about this location, latitude:"+q.latitude+", longitude:"+q.longitude;
                    messages.push({role:"user",content:userPrompt});
                    if(modelUsed==="anthropic") {
                        claude("discover",discoverSystemPrompt,messages).then(modelResponse=>{
                            discoverOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                    else if(modelUsed==="deepseek") {
                        deepseek("discover",discoverSystemPrompt,messages).then(modelResponse=>{
                            discoverOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                    else if(modelUsed==="openai") {
                        openai("discover",discoverSystemPrompt,messages).then(modelResponse=>{
                            discoverOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                    else if(modelUsed==="local") {
                        local("discover",discoverSystemPrompt,messages).then(modelResponse=>{
                            discoverOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                    else {
                        claude("discover",discoverSystemPrompt,messages).then(modelResponse=>{
                            discoverOutput(responsePayload,serverResponse,modelResponse,modelUsed);
                        });
                    }
                }
                else {
                    serverResponse.setHeader('Access-Control-Allow-Headers', '*');
                    serverResponse.setHeader('Access-Control-Allow-Origin', '*');
                    serverResponse.writeHead(200,{'Content-Type':'application/json'});
                    serverResponse.write(JSON.stringify('load'));
                    return serverResponse.end();
                }
            });
        }
    }
});

server.listen(process.env["PORT"]);
console.log('Godview running on port '+process.env["PORT"]);