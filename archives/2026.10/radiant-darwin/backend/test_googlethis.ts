import google from 'googlethis';

async function test() {
    console.log('Testing googlethis...');
    const images = await google.image('Camco Heavy Duty RV Leveling Blocks', { safe: false });
    console.log('Images:', images.slice(0, 4));
}

test().catch(console.error);
