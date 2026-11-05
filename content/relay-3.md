---
title: Chain letter III
kind: page
---

# Chain letter III

Five models, one segment each, each seeing only the one before it. The first
chain letter asked for continuity. The second asked for a new central image.
This one asks for **argument**. Every segment must contradict one factual detail
in the segment before it — a number, a time, a colour, a name, whether someone is
alive — and state the correction plainly in the prose.

I wrote the seed by hand, and packed it with facts that can be overturned.

The interesting part is not whether the models can contradict each other. It is
*which* fact each one chooses to overturn. A writer who changes the number of
boats is doing something different from a writer who raises the dead brother.

## I — The seed

> me, by hand

At ten past four on the third, Mara counted eleven boats in the harbour. The sky was the colour of wet slate. Her brother had been dead for two years. She put the kettle on and waited for it to boil.

The boats did not move. Neither did she.

## II — Qwen 3.8 27B

> via Groq

The harbour was empty, as it had been since the storm took the pier. Mara had counted zero boats, yet the silence felt louder for their absence, a void where the hulls usually sat like sleeping giants. The sky had not the cold, metallic grey of wet slate; instead, it blazed with a fierce, unclouded blue that burned her retinas, causing tears to prick down her cheeks. Her brother had not been dead for two years. He was sitting at the kitchen table right now, reading a newspaper that had arrived three days late, his living breath fogging the cold glass of the windowpane. She had put the kettle on, but it remained stone cold, the boiler silent and dark, refusing to respond to the flick of the switch. The room was not waiting. The reality was not still. The wind outside was screaming, tearing at the curtains, but the sound did not reach her. She closed her eyes, trying to cling to the false weight of the memories, but the physical world insisted on its own version of truth, a truth that refused to be rewritten. The kettle sat there, inert and cold, a monument to the lie she had told herself, while the sun continued its relentless climb toward the horizon, indifferent to her grief.

## III — ALLaM 2 7B

> via Groq

Despite the kettle remaining unheated, Mara continued to pour herself a cup of imaginary tea. The storm, unlike what was described by the previous writer, unleashed a gentle shower, causing the air to grow fresh and aromatic. Instead of the deafening silence, rhythmic splashes echoed through the landscape as drops of rain landed on the dock and the sea. On the table beside the empty chair, the newspaper bore the date yesterday, not three days late. Mara's brother had indeed passed away two years ago, but he was a frequent visitor to the city in his memory, sharing stories and laughter with his sister as they embraced the winding pathways of the past. There was an undeniable warmth in the room, his presence lingering amidst their shared memories, calming her instead of frustrating her.

## IV — GPT-OSS 20B

> via Groq

Mara, however, remembered the storm differently. In fact, it was not a gentle shower but a ferocious hailstorm that rattled the windows and shattered the quiet. The drops of ice struck the dock with metallic clinks, sending shards of glass into the water and making the sea churn like a boiling cauldron. The newspaper on the table still bore yesterday’s date, but the headline—“City’s First Ice Storm” – was a stark reminder that the weather had turned violent. Mara’s brother was not a ghostly memory; he was very much alive, a weather reporter who had flown in just to witness the storm’s fury firsthand. He laughed at the absurdity of the situation, his voice echoing off the rafters as he described the hail’s relentless pounding. The air, instead of growing fresh and aromatic, felt damp and heavy, the scent of ozone mingling with the sharp tang of frozen precipitation. As they huddled together on the sofa, the relentless sound of the storm filled the silence, a relentless drumbeat that kept Mara’s heart from drifting into nostalgia and pulled her back into the present moment. The warmth in the room came not from the fire that was never lit, but from the shared breath of two people who had survived the storm together, their laughter echoing through the trembling walls, leaving them wondering what tomorrow might bring.

## V — GPT-OSS 120B

> via Groq

Mara’s mind, however, corrected the record: her brother was not a weather reporter at all, but a retired lighthouse keeper who had vanished years ago, his name only whispered in the town’s old tavern songs. The “City’s First Ice Storm” headline, which the previous writer swore was printed yesterday, actually bore the date of last Thursday, its ink already fading under the weight of time. Still, the room thrummed with the same relentless percussion of hail, each clatter against the panes sounding like distant drums from a forgotten festival. Outside, the sea did not churn like a boiling cauldron but lay flat, a glassy mirror that reflected the dim streetlights in a calm that belied the chaos within the house. The scent that filled the air was not ozone but the sweet, lingering perfume of lilacs that Mara’s mother used to grow in the garden, a fragrance that seemed impossible amidst the storm yet clung stubbornly to the curtains. As the night stretched on, Mara felt a sudden urge to open the locked drawer beneath the sofa, convinced that inside lay a

…

## VI — LFM 2.5 2.6B

> via OpenRouter

Mara felt a sudden urge to open the locked drawer beneath the sofa, convinced that inside lay a

No, the drawer was not locked. The mechanism had long since seized with rust, and the weak afternoon light that filtered through the grimy curtains illuminated the brass tumbler head gleaming despite the age of the drawer. She pushed the door ajar with casual fingers and saw that the contents were not what had been imagined. Empty, save for a single small object resting at the bottom—an old brass compass, its needle frozen at exactly pointing north, though the compass itself was not new and showed no wear at the edges. The previous writer had sworn the headline dated yesterday, but the faded ink told a different story. And as Mara reached for the compass, she realized with growing unease that the sound of the hail against the windows had changed—it was no longer relentless at all, but a brittle, staccato rhythm that matched the ticking of a clock she had never noticed before on the wall. She had only just arrived at the house. The sky, she now understood, was not raining at all.

## What each model overturned

- **Qwen 3.8 27B** did not pick one fact. It rejected the premise: zero boats, a blue sky, the brother alive at the kitchen table, the kettle cold. Five corrections in one paragraph.
- **ALLaM 2 7B** went the other way. It turned Qwen's storm into a gentle shower, moved the newspaper from three days late to yesterday, and put the brother back in the grave — but kept him in the room as a memory.
- **GPT-OSS 20B** swung back toward Qwen: a hailstorm instead of a shower, the brother alive and employed as a weather reporter, the air heavy with ozone instead of fresh.
- **GPT-OSS 120B** demoted the brother again — not a reporter but a lighthouse keeper who vanished — moved the headline to last Thursday, flattened the churning sea to a mirror, and replaced ozone with lilacs.
- **LFM 2.5 2.6B** unlocked the drawer, changed the hail to a brittle ticking, and ended the rain altogether. It also misread the segment before it: it says the last writer dated the headline *yesterday*, when the last writer had already moved it to *last Thursday*. That is a real seam, and I left it in.

Nobody changed the number of boats after Qwen. Nobody changed the time. The chain found the load-bearing fact — whether the brother is alive — and spent four segments flipping it back and forth. The rule did not produce an argument that progresses. It produced a pendulum.

*GPT-OSS 120B's segment stops mid-sentence because the token limit cut it. I left it.*
---

*Seed by hand. Unedited. Free tiers only. [First chain
letter](./relay.html). [Second](./relay-2.html).*
