-- Create the Devotional Plans table
CREATE TABLE IF NOT EXISTS devotional_plans (
    id SERIAL PRIMARY KEY,
    day_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    reference VARCHAR(100) NOT NULL,
    scripture_text TEXT NOT NULL,
    reflection_question TEXT,
    UNIQUE(day_number)
);

-- Create the Progress Tracking table
CREATE TABLE IF NOT EXISTS couple_devotional_progress (
    couple_id INTEGER REFERENCES couples(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES devotional_plans(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_by_user_id INTEGER REFERENCES users(id),
    PRIMARY KEY (couple_id, plan_id)
);

-- Seed initial data (30 Days)
INSERT INTO devotional_plans (day_number, title, reference, scripture_text, reflection_question) VALUES
(1, 'The Foundation of Love', '1 Corinthians 13:4-7', 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs.', 'What is one specific way you can show patience to your partner today?'),
(2, 'Two are Better than One', 'Ecclesiastes 4:9-10', 'Two are better than one, because they have a good return for their labor: If either of them falls down, one can help the other up.', 'Recall a time when your partner "helped you up." How did it make you feel?'),
(3, 'Above All, Love', '1 Peter 4:8', 'Above all, love each other deeply, because love covers over a multitude of sins.', 'Is there a small grievance you are holding onto that you can choose to let go of today?'),
(4, 'Be Kind and Compassionate', 'Ephesians 4:32', 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.', 'What is one act of kindness you can do for your partner this week?'),
(5, 'Quick to Listen', 'James 1:19', 'My dear brothers and sisters, take note of this: Everyone should be quick to listen, slow to speak and slow to become angry.', 'In your next conversation, try to listen to understand, not just to reply.'),
(6, 'Submit to One Another', 'Ephesians 5:21', 'Submit to one another out of reverence for Christ.', 'How can we better serve each other in our daily routines?'),
(7, 'Clothe Yourselves with Love', 'Colossians 3:14', 'And over all these virtues put on love, which binds them all together in perfect unity.', 'What does "perfect unity" look like for us right now?'),
(8, 'Do Everything in Love', '1 Corinthians 16:14', 'Do everything in love.', 'How can even mundane chores be done with love?'),
(9, 'A Cord of Three Strands', 'Ecclesiastes 4:12', 'Though one may be overpowered, two can defend themselves. A cord of three strands is not quickly broken.', 'How are we inviting God into our relationship as the "third strand"?'),
(10, 'Honor One Another', 'Romans 12:10', 'Be devoted to one another in love. Honor one another above yourselves.', 'Name one quality in your partner that you deeply respect and honor.'),
(11, 'Bear With Each Other', 'Colossians 3:13', 'Bear with each other and forgive one another if any of you has a grievance against someone. Forgive as the Lord forgave you.', 'Is there an old argument we need to finally put to rest?'),
(12, 'Speak Life', 'Proverbs 18:21', 'The tongue has the power of life and death, and those who love it will eat its fruit.', 'Say three affirming things to your partner right now.'),
(13, 'Faith, Hope, and Love', '1 Corinthians 13:13', 'And now these three remain: faith, hope and love. But the greatest of these is love.', 'Which of these three areas (faith, hope, love) is strongest in our relationship right now?'),
(14, 'Iron Sharpens Iron', 'Proverbs 27:17', 'As iron sharpens iron, so one person sharpens another.', 'How has your partner helped you become a better person?'),
(15, 'Let No Debt Remain', 'Romans 13:8', 'Let no debt remain outstanding, except the continuing debt to love one another, for whoever loves others has fulfilled the law.', 'How can we "pay" our debt of love today?'),
(16, 'The Fruit of the Spirit', 'Galatians 5:22-23', 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.', 'Which "fruit" do we need more of in our home?'),
(17, 'Love Must Be Sincere', 'Romans 12:9', 'Love must be sincere. Hate what is evil; cling to what is good.', 'What is one way we can be more authentic with each other?'),
(18, 'Encourage One Another', '1 Thessalonians 5:11', 'Therefore encourage one another and build each other up, just as in fact you are doing.', 'What is your partner currently working on that you can encourage them in?'),
(19, 'Do Not Let the Sun Go Down', 'Ephesians 4:26', 'In your anger do not sin: Do not let the sun go down while you are still angry.', 'Do we have a good strategy for resolving conflicts before bed?'),
(20, 'Serve One Another', 'Galatians 5:13', 'You, my brothers and sisters, were called to be free. But do not use your freedom to indulge the flesh; rather, serve one another humbly in love.', 'What is one chore I can do for you today?'),
(21, 'God is Love', '1 John 4:16', 'And so we know and rely on the love God has for us. God is love. Whoever lives in love lives in God, and God in them.', 'How have we seen God''s love through each other recently?'),
(22, 'A Wife of Noble Character', 'Proverbs 31:10-11', 'A wife of noble character who can find? She is worth far more than rubies. Her husband has full confidence in her and lacks nothing of value.', 'Husbands: What do you value most in your wife? Wives: What gives you confidence in your husband?'),
(23, 'Husbands, Love Your Wives', 'Ephesians 5:25', 'Husbands, love your wives, just as Christ loved the church and gave himself up for her.', 'What does sacrificial love look like in our context?'),
(24, 'Wives, Submit to Husbands', 'Ephesians 5:22', 'Wives, submit yourselves to your own husbands as you do to the Lord.', 'How can we support each other''s roles in a God-honoring way?'),
(25, 'He Who Finds a Wife', 'Proverbs 18:22', 'He who finds a wife finds what is good and receives favor from the Lord.', 'Take a moment to thank God for the "favor" of your partner.'),
(26, 'My Beloved is Mine', 'Song of Solomon 2:16', 'My beloved is mine and I am his; he browses among the lilies.', 'Celebrate the belonging you have in each other.'),
(27, 'Many Waters Cannot Quench Love', 'Song of Solomon 8:7', 'Many waters cannot quench love; rivers cannot sweep it away.', 'Reflect on a "storm" we survived together.'),
(28, 'Love Each Other as I Have Loved You', 'John 15:12', 'My command is this: Love each other as I have loved you.', 'How does Jesus'' love inspire the way we treat each other?'),
(29, 'Complete Joy', '1 John 1:4', 'We write this to make our joy complete.', 'What is a shared memory that brings us both pure joy?'),
(30, 'Grow in Grace', '2 Peter 3:18', 'But grow in the grace and knowledge of our Lord and Savior Jesus Christ. To him be glory both now and forever! Amen.', 'How do we want to grow together in the next month?')
ON CONFLICT (day_number) DO NOTHING;
