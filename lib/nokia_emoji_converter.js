/**
 * Nokia Emoji Converter
 * Converts text shortcuts (like :) or :heart:) to Unicode emojis
 */

window.convertToEmoji = function(text) {
    if (!text) return text;
    
    return text
        // Named emojis - matching at word boundaries
        .replace(/:hug:/g, '🤗')
        .replace(/:facepalm:/g, '🤦')
        .replace(/:ok:/g, '👌')
        .replace(/:wave:/g, '👋')
        .replace(/:\+\)/g, '🤭')
        .replace(/:\*\*/g, '🤩')
        .replace(/:lol:/g, '😂')
        .replace(/:rofl:/g, '🤣')
        .replace(/:thumbsup:/g, '👍')
        .replace(/:thumbsdown:/g, '👎')
        .replace(/:clap:/g, '👏')
        .replace(/:sleepy:/g, '😴')
        .replace(/:sweat:/g, '😅')
        .replace(/:confused:/g, '😕')
        .replace(/:grin:/g, '😁')
        .replace(/:smirk:/g, '😏')
        .replace(/:rollingeyes:/g, '🙄')
        .replace(/:cry:/g, '😭')
        .replace(/:angry:/g, '😠')
        .replace(/:heart:/g, '❤️')
        .replace(/:star:/g, '⭐')
        .replace(/:fire:/g, '🔥')
        .replace(/:100:/g, '💯')
        .replace(/:poop:/g, '💩')
        .replace(/:alien:/g, '👽')
        .replace(/:robot:/g, '🤖')
        .replace(/:ghost:/g, '👻')
        .replace(/:skull:/g, '💀')
        .replace(/:cat:/g, '🐱')
        .replace(/:dog:/g, '🐶')
        .replace(/:unicorn:/g, '🦄')
        .replace(/:chicken:/g, '🐔')
        .replace(/:penguin:/g, '🐧')
        .replace(/:monkey:/g, '🐒')
        .replace(/:turtle:/g, '🐢')
        .replace(/:elephant:/g, '🐘')
        .replace(/:panda:/g, '🐼')
        .replace(/:apple:/g, '🍎')
        .replace(/:banana:/g, '🍌')
        .replace(/:pizza:/g, '🍕')
        .replace(/:cake:/g, '🍰')
        .replace(/:coffee:/g, '☕')
        .replace(/:beer:/g, '🍺')
        .replace(/:wine:/g, '🍷')
        .replace(/:sun:/g, '☀️')
        .replace(/:moon:/g, '🌙')
        .replace(/:star2:/g, '🌟')
        .replace(/:cloud:/g, '☁️')
        .replace(/:zap:/g, '⚡')
        .replace(/:snowflake:/g, '❄️')
        .replace(/:rainbow:/g, '🌈')
        .replace(/:sparkles:/g, '✨')
        .replace(/:balloon:/g, '🎈')
        .replace(/:tada:/g, '🎉')
        .replace(/:gift:/g, '🎁')
        .replace(/:party:/g, '🥳')
        .replace(/:birthday:/g, '🎂')
        .replace(/:soccer:/g, '⚽')
        .replace(/:basketball:/g, '🏀')
        .replace(/:baseball:/g, '⚾')
        .replace(/:tennis:/g, '🎾')
        .replace(/:football:/g, '🏈')
        .replace(/:medal:/g, '🏅')
        .replace(/:trophy:/g, '🏆')
        .replace(/:flag:/g, '🏳️')
        .replace(/:lock:/g, '🔒')
        .replace(/:unlock:/g, '🔓')
        .replace(/:key:/g, '🔑')
        .replace(/:lightbulb:/g, '💡')
        .replace(/:hammer:/g, '🔨')
        .replace(/:syringe:/g, '💉')
        .replace(/:cryingcat:/g, '😿')
        .replace(/:sunglasses:/g, '😎')
        .replace(/:blush:/g, '😊')
        .replace(/:kissing:/g, '😘')
        .replace(/:thinking:/g, '🤔')
        .replace(/:shushing:/g, '🤫')
        .replace(/:ninja:/g, '🥷')
        .replace(/:spock:/g, '🖖')
        .replace(/:vampire:/g, '🧛')
        .replace(/:pirate:/g, '🏴‍☠️')
        .replace(/:clown:/g, '🤡')
        .replace(/:zombie:/g, '🧟')
        .replace(/:chocolate:/g, '🍫')
        .replace(/:popcorn:/g, '🍿')
        .replace(/:taco:/g, '🌮')
        .replace(/:hamburger:/g, '🍔')
        .replace(/:hotdog:/g, '🌭')
        .replace(/:fries:/g, '🍟')
        .replace(/:salad:/g, '🥗')
        .replace(/:pie:/g, '🥧')
        .replace(/:mushroom:/g, '🍄')
        .replace(/:peach:/g, '🍑')
        
        // Classic text emojis - simpler patterns without word boundaries
        // These should work mid-sentence
        .replace(/:\)/g, '😊')  // :)
        .replace(/:\(/g, '🙁')  // :(
        .replace(/:D/g, '😀')   // :D
        .replace(/:P/g, '😛')   // :P
        .replace(/;\)/g, '😉')  // ;)
        .replace(/:O/g, '😮')   // :O
        .replace(/:o/g, '😯')   // :o
        .replace(/:S/g, '😕')   // :S
        .replace(/:s/g, '😕')   // :s
        .replace(/:\//g, '😕')  // :/
        .replace(/:\'\(/g, '😢') // :'(
        .replace(/:\'\)/g, '😂') // :')
        .replace(/<3/g, '❤️')    // <3
        .replace(/:\*\)/g, '😘') // :*)
        .replace(/B\)/g, '😎')  // B)
        .replace(/X\(/g, '😡')  // X(
        .replace(/O:\)/g, '😇') // O:)
        .replace(/\(\^_\^\)/g, '😊') // (^_^)
        .replace(/<\/3/g, '💔') // </3
        .replace(/:v/g, '😆')   // :v
        .replace(/:c/g, '😥')   // :c
        .replace(/:\|/g, '😐');  // :|
}

console.log('✅ Emoji Converter loaded');
