const apiKey = "AIzaSyCYi7hYDHdhJwGY1nhr0tiitdawzy09pX0";

async function main() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    const models = data.models || [];
    console.log("All matching models:");
    models.forEach(m => {
      if (m.name.includes("gemini") && m.supportedGenerationMethods.includes("generateContent")) {
        console.log(`- ${m.name}`);
      }
    });
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
