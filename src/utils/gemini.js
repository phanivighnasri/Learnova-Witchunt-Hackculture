const GROQ_KEY = import.meta.env.VITE_GROQ_KEY || "";

export const callGroq = async (prompt) => {
  try {
    if (!GROQ_KEY || GROQ_KEY === "PASTE_YOUR_GROQ_KEY_HERE") {
      return "Please add your Groq API key to the top of the file.";
    }

    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      }
    );

    const data = await res.json();
    console.log("Groq raw response:", JSON.stringify(data, null, 2));

    if (data.error) {
      return "Groq error: " + data.error.message;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (text) return text;

    return "Raw: " + JSON.stringify(data).slice(0, 200);

  } catch (err) {
    console.error("Groq fetch failed:", err);
    return "Fetch error: " + err.message;
  }
};

export function buildChemPrompt({ startPH, finalPH, timeSeconds, shakeCount, studentName, acidFull, baseFull, concentration, indicator, productName, equation, funFact, warningsTriggered }) {
  const acid = acidFull || 'HCl'
  const base = baseFull || 'NaOH'
  const conc = concentration || '0.5M'
  const ind = indicator || 'phenolphthalein'
  const product = productName || 'salt'
  const eq = equation ? ` The equation: ${equation}.` : ''
  const fact = funFact ? ` Fun fact: ${funFact}` : ''
  const warned = warningsTriggered?.length > 0 ? ` Safety note — the student triggered ${warningsTriggered.length} warning(s) during the experiment.` : ''
  return `The student "${studentName}" completed a neutralization experiment mixing ${conc} ${acid} with ${base}, using ${ind} as indicator. They started at pH ${startPH} and reached pH ${finalPH.toFixed(1)} in ${Math.round(timeSeconds)}s with ${shakeCount} stirs. Product formed: ${product}.${eq}${fact}${warned} Give a warm 3-sentence response for a Class 9-10 student in India: what happened chemically, what they did well, and one thing to explore next. Be enthusiastic and encouraging.`
}

export function buildBioPrompt({ correctCount, missedStructures, studentName }) {
  const missed = missedStructures.length > 0 ? missedStructures.join(', ') : 'none'
  return `The student "${studentName}" completed onion cell microscopy. They labeled ${correctCount}/5 structures correctly. Missed structures: ${missed}. Give a 3-sentence response: what they observed under the microscope, why iodine staining works biologically, and a helpful hint about the structures they missed. Use Class 9 level language. Be encouraging.`
}

export function buildPhysicsPrompt({ anglesExplored, tirCount, studentName, materialsExplored, quizScore, quizTotal }) {
  const materials = materialsExplored ?? anglesExplored ?? 3
  const score = quizScore ?? 0
  const total = quizTotal ?? 3
  return `A student just completed an interactive Snell's Law experiment in 4 stages. They explored refraction across ${materials} materials, filled in a data table discovering the refractive index pattern themselves, observed total internal reflection, and scored ${score}/${total} on the quiz. Write 3 sentences: first acknowledge what they discovered about the relationship between angles and refractive index using their specific score as reference, second explain one real world application they might find surprising, third give an encouraging challenge to explore further. Class 10 level, conversational and enthusiastic tone.`
}
