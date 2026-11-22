// Curated 5-character answers. Every character must be one of the 90 playable
// characters (no space, backtick or backslash). Tests enforce length, charset
// and uniqueness. Order here does not matter: the daily order is a seeded shuffle.

const WORDS = `
apple beach bread brick bring brown candy chair charm cheap chess chest chill
cloud clock coast crane crowd crown dance dream drink earth event field flame
flash fleet float flock floor flour fluid focus forge frame fresh frost fruit
ghost giant glass globe glove grain grape grass green guest happy heart honey
horse hotel house image juice knife laugh lemon light limit lucky lunch magic
maple match metal mango money month motor mouse music night noble ocean olive
orbit paint panel paper party peace pearl phone piano pilot pizza plane plant
plate point pound power pride prize proud queen quick quiet radio raven river
robot rocky round royal salad sauce scale scarf scene shade shape share shark
sheep shelf shell shine shirt shoes sight skill sleep slice smile smoke snack
snake solid sound south space spark spice spoon sport stamp stand steam steel
stone storm story sugar sunny sweet table tiger toast topic torch tower track
trail train treat trend truck trust truth uncle under unity value video vivid
voice water whale wheat wheel white whole world worth yacht young zebra
adult agent alarm album alert alien amber angle ankle arena argue arrow attic
award bacon badge basil basin batch blade blank blaze blend bloom board bonus
boost brain brave brush cabin cable camel canal cargo cedar chalk chart cider
cliff climb cocoa comet coral couch cream crisp curry daisy debut delta denim
diary dough draft drift eagle elbow ember enjoy equal extra fable fairy feast
ferry fever fiber flint forty fudge gecko glide gravy habit hazel hedge hobby
igloo index ivory jelly jewel joker kayak koala label lilac llama lodge lotus
lyric mayor medal melon merit minty moose mossy nerve ninja novel oasis otter
patio peach pecan petal plaza plush polar poppy quilt quota rally ranch relay
rhyme rider rumor salsa satin scout shrub siren skate sloth spine squid stair
swirl syrup tempo thumb tulip tuner ultra vapor vault verse viola waltz wagon
woven yeast yodel zesty
`;

// Natural capitals: places, months, planets, acronyms.
const CAPITALS = `
Paris Tokyo Texas Maine Idaho Egypt China India Japan Spain Italy Kenya Chile
Nepal Wales Milan Cairo Delhi Seoul Dubai Miami Boise Lagos Quito Hanoi Malta
Ghana Qatar Haiti Tonga Samoa Palau Nauru Congo Sudan Yemen Libya Benin Gabon
Perth Osaka Kyoto Lyons Turin Bern! Rome! Oslo! Lima! Fiji! Iowa! Ohio! Utah!
March April Venus Earth Pluto Mars! Texan Dutch Swiss Irish Welsh Greek Roman
NASA! LASER RADAR SCUBA ASAP! OMG!! DIY!! FAQ's ATM's
`;

// Symbols, digits, contractions and internet shapes.
const SYMBOLS = `
e=mc2 2+2=4 1+1=2 3.141 $9.99 99.9% 100%! 50/50 10:30 12:00 9:15! 1,000
#love #tbt! #goal #mood @home @noon wow!! yay!! ok!!! no!!! why?? what? huh??
(o_o) (^_^) <3<3! :-))) ;-))) [1,2] {a:1} x^2+1 a+b=c 3x+y! 7*6=? x>y+1
don't can't won't isn't ain't we're you'd she's it'll who's I'm!!
x-ray T-Rex yo-yo hi-fi lo-fi K-pop J-pop A-OK! U-235 F-16!
`;

function parse(block: string): string[] {
  return block.split(/\s+/).filter(Boolean);
}

export const ANSWERS: string[] = [...parse(WORDS), ...parse(CAPITALS), ...parse(SYMBOLS)];

export const ANSWER_GROUPS = {
  words: parse(WORDS),
  capitals: parse(CAPITALS),
  symbols: parse(SYMBOLS),
};
