import JSConfetti from "js-confetti";

export function showConfetti(emojis: string[]) {
    const config = {
        emojis: emojis,
        emojiSize: 150,
        confettiNumber: 30,
    };
    (new JSConfetti()).addConfetti(config);
}
