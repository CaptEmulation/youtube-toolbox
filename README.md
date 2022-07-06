# youtube-toolbox

Web app that runs on AWS but talks to Google :sob:

## Why

A family member who is a content creator was unsatisfied with the features of StreamLabs and StreamElements. Neither did everything they need. In addition there was a desire to create highly customized triggers from chat activity, to for example influence a game being placed on stream and for which some work had already been done.

Sure, they could just hook it up to a button on their stream deck, but there is always a chance that a notification could be missed or delayed.

## Requirements

Listens to chat of a youtube channel. Assign various cooldowns to the type of events that occur in chat (chat / superchat / gift / membership) and add points associated with a viewer when these events happen outside a cooldown.

Viewers can type `!points` to have a bot print the number of points they have and `!redeem {type}` to redeem points for a type of reward. If they have enough points then the reward is fired.

Rewards include:

- Play a sound
- Influence a game (e.g. spawn an enemy)

## Architecture

I have a lot more experience in AWS than GCP. In hindsight, building a cloud service to talk to google cloud may have best been done in GCP and learning is learning but in this case I stuck with what I know.

To play sound effects, a webpage is used to listen for events that require a sound effect to be played. The webpage is added as a scene in OBS.

Getting a token to connect to a livechat requires an oauth grant flow, which again requires a webpage.

Next.js and next-auth are used for the core web technology and the wrapper around google-oauth.
