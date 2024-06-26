const { EmbedBuilder } = require('discord.js');

class hangman {
    constructor(word = null, interaction, players, messages, displayWordOnGameOver, lives, deleteMessage) {
        this.word = word;
        this.startingLives = lives;
        this.lives = lives;
        this.progress = hangman.hyphenString(this.word.length);
        this.remaining = this.word.length;
        this.misses = [];
        this.status = 'in progress';
        this.gameOver = false;
        this.interaction = interaction;
        this.message = null;
        this.players = players;
        this.messages = messages;
        this.displayWordOnGameOver = displayWordOnGameOver;
        this.del = deleteMessage;
    }

    static hyphenString(n) {
        return '-'.repeat(n); 
    };

    replaceChar(char) { 
        for (let i = 0; i < this.word.length; ++i) { 
            if (this.word[i] === char) { 
                this.progress = this.progress.substring(0, i) + this.word[i] + this.progress.substring(i + this.word[i].length); 
                this.remaining--; 
            }; 
        }; 
    };

    async showProgress() {

        const embed = new EmbedBuilder()
            .setDescription('```\n' + this.getFigure() + '```')
            .addFields([{ name: 'Игроки', value: this.playerlist() }])
            .setColor(this.gameOver ? (this.status === 'won' ? '#3fcc65' : '#3fcc65') : '#3fcc65');
        
        if (this.message) await this.message.edit({ embeds: [embed] });
        else this.message = await this.interaction.channel.send({ embeds: [embed] });
    };
    
    playerlist() {
        if (!this.players.length) return this.messages.noplayersleft;
        const filter = this.players.slice(0, 3);
        const remaining = this.players.length - filter.length === 0 ? '' : `+ ${this.players.length - filter.length} more`;
        return filter.join('\n') + remaining;
    };

    getFigure() {

        let livesString = '';
        if(this.startingLives > 6) {
            livesString = `❤️×${this.lives}`;
        }
        else livesString = '❤️'.repeat(this.lives) + '🖤'.repeat(this.startingLives - this.lives);

        return `
     +---+
     |   |      ${this.progress}
     ${this.lives < 6 ? '0' : ' '}   |
    ${this.lives < 4 ? '/' : ' '}${this.lives < 5 ? '|' : ' '}${this.lives < 3 ? '\\' : ' '}  |      ${livesString}
    ${this.lives < 2 ? '/' : ' '} ${this.lives < 1 ? '\\' : ' '}  |      ${this.messages.misses}: ${this.misses.join(' ')}
         |
     =========  ${this.gameOver ? (this.status === 'won' ? this.messages.won : this.messages.gameOver) : ''} ${this.displayWordOnGameOver && this.gameOver && this.status !== 'won' ? this.messages.gameOverMsg.replace(/{word}/gi, this.word) : ''}
        `;
    };

    guess(c) {
        if (this.progress.includes(c)) this.lives--; 
        else if (this.word.includes(c)) this.replaceChar(c);
        else { 
            if (!this.misses.includes(c)) this.misses.push(c); 
            this.lives--; 
        };
        if (this.lives === 0) this.status = 'lost';
        else if (this.remaining === 0) this.status = 'won';
        return { 
            status: this.status, 
            progress: this.progress, 
            misses: this.misses, 
            lifes: this.lives 
        };
    };

    guessAll(word) {
        if (this.word === word) { 
            this.progress = this.word; 
            this.status = 'won'; 
        } 
        else this.lives--; 
        return this.status === 'won';
    };

    async start() {

        this.replaceChar(' ');
        
        await this.showProgress();

        const filter = (m) => this.players.find(p => p.id == m.author.id);

        const collector = this.interaction.channel.createMessageCollector({ filter: filter, time: 900_000 });

        return new Promise(resolve => {
            collector.on('collect', async (m) => {

                //if (!m.content.match(new RegExp(`^[A-Za-zÀ-ú](?:.{0}|.{${this.word.length - 1}})$`))) return;
                const c = m.content.toLowerCase();
                if(this.del) m.delete();
                if (m.content.length === this.word.length) { 
                    if (this.guessAll(c) === false) this.players = this.players.filter(p => p.id !== m.author.id); 
                } 
                else if (m.content.length === 1) this.guess(c); 
                else return; 
                
                await this.showProgress();
                if (this.status !== 'in progress') collector.stop(); 
                else if (this.players.length < 1) { 
                    collector.stop(); 
                    this.status = 'lost'; 
                };
            });
            collector.on('end', async () => {
                this.gameOver = true;
                await this.showProgress();
                resolve();
            });
        });
    };
};

module.exports = hangman;
