1. Récupérer la métadata de chaque image.
   a. Pour cela, il faut aller dans la table posts, récupérer toutes les entrées de post_type = attachment et récupérer l'ID.
   b. Une fois l'id récupéré, il faut rechercher l'ID dans la table postmeta, dans la colonne post_id. Pour le filtre, il faut préciser que la meta_key est _wp_attachment_metadata. Voici la requête SQL que j'ai: SELECT * FROM `M3hSHDUe_postmeta` WHERE post_id='312449' AND meta_key='_wp_attachment_metadata';
   
Une fois qu'on a bien récupéré la row qui correspond à ces paramètres, on va aller dans la colonne meta_value et on obtient ce genre de code de metadata:
(Sans AWS)
a:6:{s:5:"width";i:305;s:6:"height";i:480;s:4:"file";s:47:"2024/06/Conference-de-Melanie-Levy-Thiebaut.png";s:8:"filesize";i:172522;s:5:"sizes";a:2:{s:6:"medium";a:5:{s:4:"file";s:47:"Conference-de-Melanie-Levy-Thiebaut-191x300.png";s:5:"width";i:191;s:6:"height";i:300;s:9:"mime-type";s:9:"image/png";s:8:"filesize";i:69132;}s:9:"thumbnail";a:5:{s:4:"file";s:47:"Conference-de-Melanie-Levy-Thiebaut-150x150.png";s:5:"width";i:150;s:6:"height";i:150;s:9:"mime-type";s:9:"image/png";s:8:"filesize";i:29924;}}s:10:"image_meta";a:12:{s:8:"aperture";s:1:"0";s:6:"credit";s:0:"";s:6:"camera";s:0:"";s:7:"caption";s:0:"";s:17:"created_timestamp";s:1:"0";s:9:"copyright";s:0:"";s:12:"focal_length";s:1:"0";s:3:"iso";s:1:"0";s:13:"shutter_speed";s:1:"0";s:5:"title";s:0:"";s:11:"orientation";s:1:"0";s:8:"keywords";a:0:{}}}

Avec AWS:
a:7:{s:5:"width";i:1920;s:6:"height";i:1282;s:4:"file";s:47:"2025/03/joshua-sortino-LqKhnDzSF-8-unsplash.jpg";s:8:"filesize";i:1354491;s:5:"sizes";a:6:{s:6:"medium";a:6:{s:4:"file";s:47:"joshua-sortino-LqKhnDzSF-8-unsplash-300x200.jpg";s:5:"width";i:300;s:6:"height";i:200;s:9:"mime-type";s:10:"image/jpeg";s:8:"filesize";i:44454;s:2:"s3";a:10:{s:3:"url";s:114:"https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-300x200.jpg";s:6:"bucket";s:23:"wp-simonenelson-website";s:7:"privacy";s:11:"public-read";s:3:"key";s:55:"2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-300x200.jpg";s:8:"provider";s:2:"s3";s:1:"v";s:5:"4.0.2";s:9:"optimized";b:0;s:7:"options";a:0:{}s:7:"formats";a:0:{}s:9:"mime-type";s:10:"image/jpeg";}}s:5:"large";a:6:{s:4:"file";s:48:"joshua-sortino-LqKhnDzSF-8-unsplash-1024x684.jpg";s:5:"width";i:1024;s:6:"height";i:684;s:9:"mime-type";s:10:"image/jpeg";s:8:"filesize";i:358689;s:2:"s3";a:10:{s:3:"url";s:115:"https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-1024x684.jpg";s:6:"bucket";s:23:"wp-simonenelson-website";s:7:"privacy";s:11:"public-read";s:3:"key";s:56:"2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-1024x684.jpg";s:8:"provider";s:2:"s3";s:1:"v";s:5:"4.0.2";s:9:"optimized";b:0;s:7:"options";a:0:{}s:7:"formats";a:0:{}s:9:"mime-type";s:10:"image/jpeg";}}s:9:"thumbnail";a:6:{s:4:"file";s:47:"joshua-sortino-LqKhnDzSF-8-unsplash-150x150.jpg";s:5:"width";i:150;s:6:"height";i:150;s:9:"mime-type";s:10:"image/jpeg";s:8:"filesize";i:28849;s:2:"s3";a:10:{s:3:"url";s:114:"https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-150x150.jpg";s:6:"bucket";s:23:"wp-simonenelson-website";s:7:"privacy";s:11:"public-read";s:3:"key";s:55:"2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-150x150.jpg";s:8:"provider";s:2:"s3";s:1:"v";s:5:"4.0.2";s:9:"optimized";b:0;s:7:"options";a:0:{}s:7:"formats";a:0:{}s:9:"mime-type";s:10:"image/jpeg";}}s:12:"medium_large";a:6:{s:4:"file";s:47:"joshua-sortino-LqKhnDzSF-8-unsplash-768x513.jpg";s:5:"width";i:768;s:6:"height";i:513;s:9:"mime-type";s:10:"image/jpeg";s:8:"filesize";i:214581;s:2:"s3";a:10:{s:3:"url";s:114:"https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-768x513.jpg";s:6:"bucket";s:23:"wp-simonenelson-website";s:7:"privacy";s:11:"public-read";s:3:"key";s:55:"2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-768x513.jpg";s:8:"provider";s:2:"s3";s:1:"v";s:5:"4.0.2";s:9:"optimized";b:0;s:7:"options";a:0:{}s:7:"formats";a:0:{}s:9:"mime-type";s:10:"image/jpeg";}}s:9:"1536x1536";a:6:{s:4:"file";s:49:"joshua-sortino-LqKhnDzSF-8-unsplash-1536x1026.jpg";s:5:"width";i:1536;s:6:"height";i:1026;s:9:"mime-type";s:10:"image/jpeg";s:8:"filesize";i:688476;s:2:"s3";a:10:{s:3:"url";s:116:"https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-1536x1026.jpg";s:6:"bucket";s:23:"wp-simonenelson-website";s:7:"privacy";s:11:"public-read";s:3:"key";s:57:"2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-1536x1026.jpg";s:8:"provider";s:2:"s3";s:1:"v";s:5:"4.0.2";s:9:"optimized";b:0;s:7:"options";a:0:{}s:7:"formats";a:0:{}s:9:"mime-type";s:10:"image/jpeg";}}s:18:"cmplz_banner_image";a:6:{s:4:"file";s:47:"joshua-sortino-LqKhnDzSF-8-unsplash-350x100.jpg";s:5:"width";i:350;s:6:"height";i:100;s:9:"mime-type";s:10:"image/jpeg";s:8:"filesize";i:35376;s:2:"s3";a:10:{s:3:"url";s:114:"https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-350x100.jpg";s:6:"bucket";s:23:"wp-simonenelson-website";s:7:"privacy";s:11:"public-read";s:3:"key";s:55:"2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-350x100.jpg";s:8:"provider";s:2:"s3";s:1:"v";s:5:"4.0.2";s:9:"optimized";b:0;s:7:"options";a:0:{}s:7:"formats";a:0:{}s:9:"mime-type";s:10:"image/jpeg";}}}s:10:"image_meta";a:12:{s:8:"aperture";s:1:"0";s:6:"credit";s:0:"";s:6:"camera";s:0:"";s:7:"caption";s:0:"";s:17:"created_timestamp";s:1:"0";s:9:"copyright";s:0:"";s:12:"focal_length";s:1:"0";s:3:"iso";s:1:"0";s:13:"shutter_speed";s:1:"0";s:5:"title";s:0:"";s:11:"orientation";s:1:"0";s:8:"keywords";a:0:{}}s:2:"s3";a:10:{s:3:"url";s:106:"https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash.jpg";s:6:"bucket";s:23:"wp-simonenelson-website";s:7:"privacy";s:11:"public-read";s:3:"key";s:47:"2025/03/joshua-sortino-LqKhnDzSF-8-unsplash.jpg";s:8:"provider";s:2:"s3";s:1:"v";s:5:"4.0.2";s:9:"optimized";b:0;s:7:"options";a:0:{}s:7:"formats";a:0:{}s:9:"mime-type";s:10:"image/jpeg";}}

Désérialisé ça ressemble à ceci:
Array
(
    [width] => 1920
    [height] => 1282
    [file] => 2025/03/joshua-sortino-LqKhnDzSF-8-unsplash.jpg
    [filesize] => 1354491
    [sizes] => Array
        (
            [medium] => Array
                (
                    [file] => joshua-sortino-LqKhnDzSF-8-unsplash-300x200.jpg
                    [width] => 300
                    [height] => 200
                    [mime-type] => image/jpeg
                    [filesize] => 44454
                    [s3] => Array
                        (
                            [url] => https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-300x200.jpg
                            [bucket] => wp-simonenelson-website
                            [privacy] => public-read
                            [key] => 2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-300x200.jpg
                            [provider] => s3
                            [v] => 4.0.2
                            [optimized] => 
                            [options] => Array
                                (
                                )

                            [formats] => Array
                                (
                                )

                            [mime-type] => image/jpeg
                        )

                )

            [large] => Array
                (
                    [file] => joshua-sortino-LqKhnDzSF-8-unsplash-1024x684.jpg
                    [width] => 1024
                    [height] => 684
                    [mime-type] => image/jpeg
                    [filesize] => 358689
                    [s3] => Array
                        (
                            [url] => https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-1024x684.jpg
                            [bucket] => wp-simonenelson-website
                            [privacy] => public-read
                            [key] => 2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-1024x684.jpg
                            [provider] => s3
                            [v] => 4.0.2
                            [optimized] => 
                            [options] => Array
                                (
                                )

                            [formats] => Array
                                (
                                )

                            [mime-type] => image/jpeg
                        )

                )

            [thumbnail] => Array
                (
                    [file] => joshua-sortino-LqKhnDzSF-8-unsplash-150x150.jpg
                    [width] => 150
                    [height] => 150
                    [mime-type] => image/jpeg
                    [filesize] => 28849
                    [s3] => Array
                        (
                            [url] => https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-150x150.jpg
                            [bucket] => wp-simonenelson-website
                            [privacy] => public-read
                            [key] => 2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-150x150.jpg
                            [provider] => s3
                            [v] => 4.0.2
                            [optimized] => 
                            [options] => Array
                                (
                                )

                            [formats] => Array
                                (
                                )

                            [mime-type] => image/jpeg
                        )

                )

            [medium_large] => Array
                (
                    [file] => joshua-sortino-LqKhnDzSF-8-unsplash-768x513.jpg
                    [width] => 768
                    [height] => 513
                    [mime-type] => image/jpeg
                    [filesize] => 214581
                    [s3] => Array
                        (
                            [url] => https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-768x513.jpg
                            [bucket] => wp-simonenelson-website
                            [privacy] => public-read
                            [key] => 2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-768x513.jpg
                            [provider] => s3
                            [v] => 4.0.2
                            [optimized] => 
                            [options] => Array
                                (
                                )

                            [formats] => Array
                                (
                                )

                            [mime-type] => image/jpeg
                        )

                )

            [1536x1536] => Array
                (
                    [file] => joshua-sortino-LqKhnDzSF-8-unsplash-1536x1026.jpg
                    [width] => 1536
                    [height] => 1026
                    [mime-type] => image/jpeg
                    [filesize] => 688476
                    [s3] => Array
                        (
                            [url] => https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-1536x1026.jpg
                            [bucket] => wp-simonenelson-website
                            [privacy] => public-read
                            [key] => 2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-1536x1026.jpg
                            [provider] => s3
                            [v] => 4.0.2
                            [optimized] => 
                            [options] => Array
                                (
                                )

                            [formats] => Array
                                (
                                )

                            [mime-type] => image/jpeg
                        )

                )

            [cmplz_banner_image] => Array
                (
                    [file] => joshua-sortino-LqKhnDzSF-8-unsplash-350x100.jpg
                    [width] => 350
                    [height] => 100
                    [mime-type] => image/jpeg
                    [filesize] => 35376
                    [s3] => Array
                        (
                            [url] => https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-350x100.jpg
                            [bucket] => wp-simonenelson-website
                            [privacy] => public-read
                            [key] => 2025/03/joshua-sortino-LqKhnDzSF-8-unsplash-350x100.jpg
                            [provider] => s3
                            [v] => 4.0.2
                            [optimized] => 
                            [options] => Array
                                (
                                )

                            [formats] => Array
                                (
                                )

                            [mime-type] => image/jpeg
                        )

                )

        )

    [image_meta] => Array
        (
            [aperture] => 0
            [credit] => 
            [camera] => 
            [caption] => 
            [created_timestamp] => 0
            [copyright] => 
            [focal_length] => 0
            [iso] => 0
            [shutter_speed] => 0
            [title] => 
            [orientation] => 0
            [keywords] => Array
                (
                )

        )

    [s3] => Array
        (
            [url] => https://wp-simonenelson-website.s3.eu-west-3.amazonaws.com/2025/03/joshua-sortino-LqKhnDzSF-8-unsplash.jpg
            [bucket] => wp-simonenelson-website
            [privacy] => public-read
            [key] => 2025/03/joshua-sortino-LqKhnDzSF-8-unsplash.jpg
            [provider] => s3
            [v] => 4.0.2
            [optimized] => 
            [options] => Array
                (
                )

            [formats] => Array
                (
                )

            [mime-type] => image/jpeg
        )

)

1. Il faut donc désérialiser ce code.
2. Récupérer les images via l'URL présent dans la métadata désérialisée.
3. Les envoyer sur AWS.
4. Ajouter le lien vers l'image de AWS DANS la métadata (tableau S3)
5. Sérialiser la métadata puis l'envoyer en base de données.