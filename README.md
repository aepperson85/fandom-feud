Fandom Feud
Family Feud-style game show built for 2D Con and Mall of America pop-ups. It runs entirely in the browser and syncs live over Firebase. No installs needed: run the game from a phone while the display shows on any screen.
Start at the home page, `https://aepperson85.github.io/fandom-feud/`. It has a link to every page below, and each one opens in a new window.
Pages in this repo
File	What it is	Where it's used
`index.html`	Home page with links to everything else.	Point people here.
`control.html`	Control panel. Pick questions, reveal answers, add strikes, award points, change the display background. Built for phones.	Run this on your phone to operate the game.
`display.html`	Game display, centered layout. No space reserved for a camera.	Conventions and any venue without a live camera overlay.
`streaming.html`	Game display, camera-space layout. Question and answers sit on the right, and the left side is left empty for a live camera feed.	Mall of America, where a production team overlays a camera feed in OBS.
`questions.html`	Question editor. Add, change, reorder or delete questions with plain text boxes.	Used before the event by anyone helping.
`backgrounds.js`	The list of choices in the control panel's Display Background dropdown.	Edited when you add a new con or look.
`2dcon.mp4`, `Akeome.mp4`	The branded background loops for each con. They must stay in the main folder next to the HTML files, and the names must match `backgrounds.js` exactly (capital letters count).	Loaded by the display pages.
The display pages only show the game. `control.html` is the only page that changes the game. Any mix of pages open on different devices stays in sync in real time.
Running an event
Open `control.html` on your phone.
Open the right display on the screen: `display.html` for a convention, `streaming.html` for a camera overlay.
Pick a question from the dropdown, press Reveal as teams guess, press Add Strike for wrong guesses, and press Award to Team when the round ends. Picking a new question clears the strikes and the round pot.
Reset All sets scores, strikes and the pot back to zero.
Changing the display background
In the control panel, use the Display Background dropdown. The change shows on every display screen at once.
To add a new con or look, open `backgrounds.js` and copy one of the blocks. Give it a new `id` and `label` (the label is what appears in the dropdown), a color, and, if you have one, an mp4 file name. Upload the mp4 to the main folder. A commented example is at the bottom of the file. Don't rename an existing `id`, because the saved choice is stored by that name.
Editing questions
Open `questions.html`.
Tap a question to open it. Change the question text, the answers and the points.
Use + Add answer, Move up, Move down and Delete question as needed. Add a whole new question with the button at the bottom of the list.
Press Save. The page will not save if something is blank or a points box isn't a number, and it says which question to fix.
The control panel gets the new list right away. Re-pick a question in its dropdown to refresh the display.
The saved list lives online in Firebase, and it is the only copy the game uses. Use Download backup file at the bottom of the Questions page now and then. If the list is ever lost, Restore from a backup file brings it back (then press Save).
Anyone with the Questions page address can edit the list. Don't post that address publicly.
Display size
Everything on the display pages scales from one number. Near the top of the style section in `display.html` and `streaming.html`, find `--scale: 1.35;`. Raise it for bigger text and boxes, lower it for smaller. Long questions shrink automatically so they always fit.
Firebase
Game state (current question, scores, strikes, revealed answers), the question list and the background choice live in a Firebase Realtime Database. The Firebase settings are embedded in `control.html`, `display.html`, `streaming.html` and `questions.html`. You only need to touch them if you ever move to a different Firebase project.
Troubleshooting
A change isn't showing up. After a commit in GitHub, wait a couple of minutes, then reload the page. Adding `?v=2` to the end of the web address skips a saved copy.
Dropdown only shows Plain Black. `backgrounds.js` is missing from the main folder or has the wrong name. It must be named exactly `backgrounds.js`.
Questions show a red warning in the control panel. Open the Questions page and fix the question it names.
Video doesn't play in a display. Check that `2dcon.mp4` is in the main folder, and that the background is set to the branded video.
